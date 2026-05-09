const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const authController = require("../controllers/auth.controller");
const {
  registerSchema,
  loginSchema,
} = require("../validators/auth.validator");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: User authentication
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Ada Lovelace" }
 *               email: { type: string, example: "ada@example.com" }
 *               password: { type: string, example: "supersecret123" }
 *     responses:
 *       201: { description: User created }
 *       409: { description: Email already registered }
 */
router.post("/register", validate({ body: registerSchema }), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Returns user + JWT token }
 *       401: { description: Invalid credentials }
 */
router.post("/login", validate({ body: loginSchema }), authController.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Unauthorized }
 */
router.get("/me", authenticate, authController.me);

module.exports = router;
