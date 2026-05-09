const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/database");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

const SALT_ROUNDS = 10;

function sanitizeUser(user) {
  if (!user) return null;
  const { password: _password, ...rest } = user;
  return rest;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict("Email is already registered");
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  });

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");
  return sanitizeUser(user);
}

module.exports = { register, login, getMe };
