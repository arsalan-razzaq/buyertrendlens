const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('./socketService');

const serialize = (value) => (typeof value?.toObject === 'function' ? value.toObject() : value);
const normalizeMailboxEmailId = (value) => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  if (/^\d+$/.test(normalized)) {
    return `inbox:${normalized}`;
  }

  return normalized;
};

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

  if (type === 'mailbox_email') {
    const normalizedEmailId = normalizeMailboxEmailId(data.emailId);

    if (normalizedEmailId) {
      const adminIds = admins.map((admin) => admin._id);
      const existingNotifications = await Notification.find({
        userId: { $in: adminIds },
        type,
        'data.emailId': { $in: [normalizedEmailId, String(data.emailId || '').trim()].filter(Boolean) }
      }).select('userId');
      const existingAdminIds = new Set(existingNotifications.map((notification) => String(notification.userId)));
      const missingAdmins = admins.filter((admin) => !existingAdminIds.has(String(admin._id)));

      if (!missingAdmins.length) {
        return [];
      }

      const notifications = await Notification.insertMany(
        missingAdmins.map((admin) => ({
          userId: admin._id,
          title,
          message,
          type,
          actionUrl,
          data: {
            ...data,
            emailId: normalizedEmailId
          }
        }))
      );

      notifications.forEach((notification) => {
        emitToUser(notification.userId, 'notification:new', serialize(notification));
      });

      return notifications;
    }
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
