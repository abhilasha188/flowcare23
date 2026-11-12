const User = require('../models/User');
const {
  clearAuthCookie,
  createAuthToken,
  setAuthCookie,
} = require('../utils/auth');

function serializeUser(user) {
  return {
    _id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    ...(user.dateOfBirth && { dateOfBirth: user.dateOfBirth }),
    ...(user.averageCycleLength != null && { averageCycleLength: user.averageCycleLength }),
    ...(user.averagePeriodDuration != null && { averagePeriodDuration: user.averagePeriodDuration }),
    notificationPreferences: user.notificationPreferences,
    predictionPreferences: user.predictionPreferences,
    aiPersonalizationConsent: false,
    createdAt: user.createdAt,
  };
}

async function register(req, res, next) {
  try {
    const {
      fullName,
      email,
      password,
      dateOfBirth,
      averageCycleLength,
      averagePeriodDuration,
    } = req.body;

    if (await User.exists({ email })) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        errors: [],
      });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      ...(dateOfBirth && { dateOfBirth }),
      ...(averageCycleLength !== undefined && averageCycleLength !== '' && {
        averageCycleLength: Number(averageCycleLength),
      }),
      ...(averagePeriodDuration !== undefined && averagePeriodDuration !== '' && {
        averagePeriodDuration: Number(averagePeriodDuration),
      }),
      termsAcceptedAt: new Date(),
    });

    const token = createAuthToken(user._id, false, user.sessionVersion);
    setAuthCookie(res, token);
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: serializeUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        errors: [],
      });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const rememberMe = req.body.rememberMe === true;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        errors: [],
      });
    }

    const token = createAuthToken(user._id, rememberMe, user.sessionVersion);
    setAuthCookie(res, token, rememberMe);
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: serializeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

function logout(_req, res) {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: 'Logout successful.',
    errors: [],
  });
}

function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Session verified.',
    user: serializeUser(req.user),
  });
}

async function updateCyclePreferences(req, res, next) {
  try {
    const { averageCycleLength, averagePeriodDuration } = req.body;
    if (averageCycleLength !== undefined) {
      req.user.averageCycleLength = averageCycleLength === '' || averageCycleLength === null
        ? undefined
        : Number(averageCycleLength);
    }
    if (averagePeriodDuration !== undefined) {
      req.user.averagePeriodDuration = averagePeriodDuration === '' || averagePeriodDuration === null
        ? undefined
        : Number(averagePeriodDuration);
    }
    await req.user.save();
    return res.status(200).json({
      success: true,
      message: 'Cycle preferences updated.',
      user: serializeUser(req.user),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCurrentUser,
  login,
  logout,
  register,
  serializeUser,
  updateCyclePreferences,
};
