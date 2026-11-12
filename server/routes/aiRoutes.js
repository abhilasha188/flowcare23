const express = require('express');
const { body, param, query } = require('express-validator');
const { rateLimit } = require('express-rate-limit');
const authenticate = require('../middleware/authMiddleware');
const { csrfProtection } = require('../middleware/csrfProtection');
const validateRequest = require('../middleware/validateRequest');
const {
  chat,
  conversations,
  deleteConversation,
  feedback,
  health,
  history,
  renameConversation,
} = require('../controllers/aiController');

const router = express.Router();
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: 'Too many assistant requests. Please wait before trying again.',
    errors: [],
  }),
});
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(asyncHandler(authenticate));
router.get('/health', asyncHandler(health));
router.post(
  '/chat',
  chatLimiter,
  csrfProtection,
  [
    body('message').isString().bail().trim().isLength({ min: 1, max: 2000 }).withMessage('Enter a question up to 2,000 characters.'),
    body('conversationId').optional().isUUID(4).withMessage('Conversation ID is invalid.'),
  ],
  validateRequest,
  asyncHandler(chat),
);
router.get(
  '/history',
  [query('conversationId').optional().isUUID(4).withMessage('Conversation ID is invalid.')],
  validateRequest,
  asyncHandler(history),
);
router.get('/conversations', asyncHandler(conversations));
router.patch(
  '/conversations/:conversationId',
  csrfProtection,
  [
    param('conversationId').isUUID(4).withMessage('Conversation ID is invalid.'),
    body('title').isString().bail().trim().isLength({ min: 1, max: 80 }).withMessage('Enter a conversation title up to 80 characters.'),
  ],
  validateRequest,
  asyncHandler(renameConversation),
);
router.delete(
  '/conversations/:conversationId',
  csrfProtection,
  [param('conversationId').isUUID(4).withMessage('Conversation ID is invalid.')],
  validateRequest,
  asyncHandler(deleteConversation),
);
router.post(
  '/feedback',
  csrfProtection,
  [
    body('messageId').isMongoId().withMessage('Assistant message ID is invalid.'),
    body('feedback').isIn(['helpful', 'not_helpful']).withMessage('Feedback must be helpful or not helpful.'),
  ],
  validateRequest,
  asyncHandler(feedback),
);

module.exports = router;
