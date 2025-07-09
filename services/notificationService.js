const Notification = require("../models/Notification.js");

class NotificationService {
  /**
   * Create a new notification
   * @param {Object} options
   * @param {String} options.recipientId
   * @param {String} [options.senderId]
   * @param {String} [options.teamId]
   * @param {String} options.type - e.g. "invitation_sent"
   * @param {String} options.message
   * @param {String} [options.link]
   */
  async create({ recipientId, senderId, teamId, type, message, link }) {
    const notification = new Notification({
      recipientId,
      senderId,
      teamId,
      type,
      message,
      link,
    });

    return await notification.save();
  }

  /**
   * Get all notifications for a user
   * @param {String} userId
   * @param {Object} options
   * @param {Boolean} [options.unreadOnly=false]
   */
  async getAllForUser(userId, options = {}) {
    const query = { recipientId: userId };
    if (options.unreadOnly) {
      query.read = false;
    }

    return await Notification.find(query)
      .sort({ createdAt: -1 })
      .populate("senderId", "name email")
      .populate("teamId", "name");
  }

  /**
   * Mark a single notification as read
   * @param {String} notificationId
   */
  async markAsRead(notificationId) {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
  }

  /**
   * Mark all notifications for a user as read
   * @param {String} userId
   */
  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { recipientId: userId, read: false },
      { $set: { read: true } }
    );
  }

  /**
   * Delete a notification
   * @param {String} notificationId
   */
  async delete(notificationId) {
    return await Notification.findByIdAndDelete(notificationId);
  }
}

module.exports = new NotificationService();
