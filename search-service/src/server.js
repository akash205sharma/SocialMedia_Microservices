require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("./utils/logger");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const searchRoutes = require("./routes/searchRoutes");
const errorHandler = require("./middleware/errorHandler");
const { connectToRabbitMQ } = require("./utils/rabbitmq");
const { consumeEvent } = require("./utils/rabbitmq");
const { handlePostCreated, handlePostDeleted } = require("./eventHandlers/searchPostEventHandler");

const app = express();
const PORT = process.env.PORT || 3004;

// //connect to mongodb
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => logger.info("Connected to mongodb"))
    .catch((e) => logger.error("Mongo connection error", e));

const redisClient = new Redis(process.env.REDIS_URL);

// //middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
});

// //DDos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "middleware",
    points: 10,
    duration: 1,
});

app.use((req, res, next) => {
    rateLimiter
        .consume(req.ip)
        .then(() => next())
        .catch(() => {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({ success: false, message: "Too many requests" });
        });
});

//Ip based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({ success: false, message: "Too many requests" });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});

//apply this sensitiveEndpointsLimiter to our routes
app.use("/api/search", sensitiveEndpointsLimiter);

//Routes
app.use("/api/search", searchRoutes);

//error handler
app.use(errorHandler);

async function startServer() {
    try {
        await connectToRabbitMQ();
        await consumeEvent('post.created', handlePostCreated)
        await consumeEvent('post.deleted', handlePostDeleted)

    } catch (error) {
        logger.error('Failed to connect to rabbit mq server', error);
    }
}

startServer()

app.listen(PORT, () => {
    logger.info(`Search service running on port ${PORT}`);
});

// //unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at", promise, "reason:", reason);
});