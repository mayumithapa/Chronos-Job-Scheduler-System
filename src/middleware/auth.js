const jwt = require("jsonwebtoken");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { prisma } = require("../config/database");

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or invalid Authorization header");
    }

    const token = header.slice("Bearer ".length).trim();
    let payload;
    try {
      payload = jwt.verify(token, env.jwt.secret);
    } catch (err) {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true },
    });

    if (!user) throw ApiError.unauthorized("User no longer exists");

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authenticate };
