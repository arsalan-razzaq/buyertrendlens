const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20),
    Notification.countDocuments({ userId: req.user._id, readAt: null })
  ]);

  res.json({
    notifications,
    unreadCount
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.notificationId,
    userId: req.user._id
  });

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found.');
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  const unreadCount = await Notification.countDocuments({ userId: req.user._id, readAt: null });

  res.json({
    notification,
    unreadCount
  });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      userId: req.user._id,
      readAt: null
    },
    {
      $set: {
        readAt: new Date()
      }
    }
  );

  res.json({
    message: 'All notifications marked as read.',
    unreadCount: 0
  });
});

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
