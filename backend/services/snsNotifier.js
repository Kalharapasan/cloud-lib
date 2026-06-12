// ============================================================
// Cloud Lib — SNS Overdue Notification Service (Simulated)
// Simulates Amazon SNS email notification for overdue books
// Uses node-cron to periodically check for overdue records
// ============================================================
const cron = require('node-cron');
const pool = require('../config/db');
require('dotenv').config();

/**
 * Check for overdue borrow records and prepare SNS notification payload
 */
const checkOverdueBooks = async () => {
  try {
    const [overdueRecords] = await pool.query(
      `SELECT br.RecordID, br.DueDate,
              u.Name AS UserName, u.Email AS UserEmail,
              b.Title AS BookTitle,
              DATEDIFF(CURDATE(), br.DueDate) AS DaysOverdue
       FROM Borrow_Records br
       JOIN Users u ON br.UserID = u.UserID
       JOIN Books b ON br.BookID = b.BookID
       WHERE br.ReturnStatus = 'Pending' AND br.DueDate < CURDATE()`
    );

    if (overdueRecords.length === 0) {
      console.log('📗 [SNS Cron] No overdue books found.');
      return;
    }

    console.log(`\n📕 [SNS Cron] Found ${overdueRecords.length} overdue record(s):\n`);

    // Build notification for each overdue record
    overdueRecords.forEach((record) => {
      const snsPayload = {
        TopicArn: process.env.SNS_TOPIC_ARN || 'arn:aws:sns:region:account:CloudLibOverdueAlerts',
        Subject: `⚠️ Overdue Book Alert — ${record.BookTitle}`,
        Message: [
          `OVERDUE BOOK NOTIFICATION`,
          `========================`,
          `Student: ${record.UserName} (${record.UserEmail})`,
          `Book: ${record.BookTitle}`,
          `Due Date: ${new Date(record.DueDate).toLocaleDateString()}`,
          `Days Overdue: ${record.DaysOverdue}`,
          `Record ID: ${record.RecordID}`,
          ``,
          `Please return the book immediately to avoid further penalties.`,
          `— Cloud Lib Automated System`
        ].join('\n'),
        MessageAttributes: {
          UserEmail: { DataType: 'String', StringValue: record.UserEmail },
          DaysOverdue: { DataType: 'Number', StringValue: String(record.DaysOverdue) }
        }
      };

      // ──────────────────────────────────────────────────────
      // SIMULATED: Log the SNS payload to console
      // In production, replace this block with:
      //
      //   const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
      //   const snsClient = new SNSClient({ region: process.env.AWS_REGION });
      //   await snsClient.send(new PublishCommand(snsPayload));
      //
      // ──────────────────────────────────────────────────────
      console.log('📨 [SNS Simulated] Notification payload:');
      console.log(`   To: ${record.UserEmail}`);
      console.log(`   Subject: ${snsPayload.Subject}`);
      console.log(`   Days Overdue: ${record.DaysOverdue}`);
      console.log('');
    });

  } catch (err) {
    console.error('❌ [SNS Cron] Error checking overdue books:', err.message);
  }
};

/**
 * Start the overdue checker cron job
 * Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00...)
 */
const startOverdueChecker = () => {
  // Schedule: every hour at minute 0
  cron.schedule('0 * * * *', () => {
    console.log('\n🔄 [SNS Cron] Running overdue book check...');
    checkOverdueBooks();
  });

  console.log('⏰ SNS Overdue Checker cron job scheduled (runs every hour)');

  // Also run once on startup for immediate feedback
  setTimeout(() => {
    console.log('\n🔄 [SNS Cron] Initial overdue book check...');
    checkOverdueBooks();
  }, 3000);
};

module.exports = { startOverdueChecker, checkOverdueBooks };
