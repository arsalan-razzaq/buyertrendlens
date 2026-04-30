const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('./socketService');

const serialize = (value) => (typeof value?.toObject === 'function' ? value.toObject() : value);

const createUserNotification = async ({ userId, title, message, type = 'system', actionUrl = '', data = {} }) => {
  const notification = await Notification.create({
    userId,
    title,
    message,
    type,
    actionUrl,
    data
  });

  emitToUser(userId, 'notification:new', serialize(notification));

  return notification;
};

const createAdminNotifications = async ({ title, message, type = 'system', actionUrl = '', data = {} }) => {
  const admins = await User.find({ role: 'admin' }).select('_id');

  if (!admins.length) {
    return [];
  }

  const notifications = await Notification.insertMany(
    admins.map((admin) => ({
      userId: admin._id,
      title,
      message,
      type,
      actionUrl,
      data
    }))
  );

  notifications.forEach((notification) => {
    emitToUser(notification.userId, 'notification:new', serialize(notification));
  });

  return notifications;
};

module.exports = {
  createUserNotification,
  createAdminNotifications
};
