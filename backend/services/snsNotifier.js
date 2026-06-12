// ============================================================
// Cloud Lib — SNS Overdue Notification Service (Production)
// Uses the real AWS SDK v3 to publish SNS messages.
// Falls back to console logging when SNS_TOPIC_ARN is not set
// (so local development still works without AWS credentials).
// ============================================================
const cron = require('node-cron');
const pool = require('../config/db');
require('dotenv').config();

// ── Lazy-load the AWS SNS client only if SNS_TOPIC_ARN is set ─
// This avoids requiring the SDK in environments where it's not installed.
let SNSClient, PublishCommand;
let snsClient = null;

const initSNS = () => {
  if (snsClient) return snsClient; // already initialised
  if (!process.env.SNS_TOPIC_ARN) return null; // not configured — use simulation

  try {
    // Dynamically require so the server starts even if the package is absent
    ({ SNSClient, PublishCommand } = require('@aws-sdk/client-sns'));
    snsClient = new SNSClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
    });
    console.log('✅ [SNS] AWS SNS client initialised (real mode)');
  } catch (err) {
    console.warn('⚠️  [SNS] @aws-sdk/client-sns not installed — using simulation mode.');
    console.warn('    Run: npm install @aws-sdk/client-sns');
  }
  return snsClient;
};

/**
 * Publish a single overdue notification to AWS SNS.
 * If SNS is not configured, logs the payload to console instead.
 * @param {object} record - Overdue borrow record from DB
 */
const publishOverdueNotification = async (record) => {
  const payload = {
    TopicArn: process.env.SNS_TOPIC_ARN,
    Subject: `⚠️ Overdue Book Alert — ${record.BookTitle}`,
    Message: [
      `OVERDUE BOOK NOTIFICATION`,
      `========================`,
      `Student : ${record.UserName} (${record.UserEmail})`,
      `Book    : ${record.BookTitle}`,
      `Due Date: ${new Date(record.DueDate).toLocaleDateString('en-GB')}`,
      `Days Overdue: ${record.DaysOverdue}`,
      `Record ID: ${record.RecordID}`,
      ``,
      `Please return the book immediately to avoid further penalties.`,
      `— Cloud Lib Automated System`
    ].join('\n'),
    // MessageAttributes let you filter subscriptions by email or severity
    MessageAttributes: {
      UserEmail: {
        DataType: 'String',
        StringValue: record.UserEmail,
      },
      DaysOverdue: {
        DataType: 'Number',
        StringValue: String(record.DaysOverdue),
      },
    },
  };

  const client = initSNS();

  if (client) {
    // ── Production: Publish to real AWS SNS ─────────────────
    try {
      const result = await client.send(new PublishCommand(payload));
      console.log(`✅ [SNS] Notification sent for ${record.UserEmail} — MessageId: ${result.MessageId}`);
    } catch (err) {
      console.error(`❌ [SNS] Failed to publish notification for ${record.UserEmail}:`, err.message);
    }
  } else {
    // ── Development: Simulate with console output ────────────
    console.log('📨 [SNS Simulated] Notification payload:');
    console.log(`   To       : ${record.UserEmail}`);
    console.log(`   Subject  : ${payload.Subject}`);
    console.log(`   Days Late: ${record.DaysOverdue}`);
    console.log('');
  }
};

/**
 * Query the database for all currently overdue books and
 * dispatch SNS notifications for each one.
 */
const checkOverdueBooks = async () => {
  try {
    const [overdueRecords] = await pool.query(
      `SELECT br.RecordID, br.DueDate,
              u.Name    AS UserName,  u.Email AS UserEmail,
              b.Title   AS BookTitle,
              DATEDIFF(CURDATE(), br.DueDate) AS DaysOverdue
       FROM   Borrow_Records br
       JOIN   Users u ON br.UserID = u.UserID
       JOIN   Books b ON br.BookID = b.BookID
       WHERE  br.ReturnStatus = 'Pending'
         AND  br.DueDate < CURDATE()`
    );

    if (overdueRecords.length === 0) {
      console.log('📗 [SNS Cron] No overdue books found.');
      return;
    }

    console.log(`\n📕 [SNS Cron] Found ${overdueRecords.length} overdue record(s). Sending notifications...\n`);

    // Publish notifications sequentially to avoid rate-limiting
    for (const record of overdueRecords) {
      await publishOverdueNotification(record);
    }

  } catch (err) {
    console.error('❌ [SNS Cron] Error checking overdue books:', err.message);
  }
};

/**
 * Start the cron job that runs overdue checks every hour.
 * Also runs once 5 seconds after server startup for immediate feedback.
 */
const startOverdueChecker = () => {
  // Initialise SNS on startup so errors surface early
  initSNS();

  // Schedule: every hour at minute 0
  cron.schedule('0 * * * *', () => {
    console.log('\n🔄 [SNS Cron] Running scheduled overdue book check...');
    checkOverdueBooks();
  });

  console.log('⏰ SNS Overdue Checker scheduled — runs every hour at :00');

  // Run once on startup (5-second delay to let DB pool settle)
  setTimeout(() => {
    console.log('\n🔄 [SNS Cron] Initial overdue book check on startup...');
    checkOverdueBooks();
  }, 5000);
};

module.exports = { startOverdueChecker, checkOverdueBooks, publishOverdueNotification };
