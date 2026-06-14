const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function getDB() {
  const db = await open({
    filename: path.join(__dirname, 'crm.db'),
    driver: sqlite3.Database
  });

  // Create tables if they don't exist
  await db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      fullName TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      source TEXT,
      status TEXT,
      assignedOfficer TEXT,
      nextFollowUpDate TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS borrowers (
      id TEXT PRIMARY KEY,
      leadId TEXT,
      fullName TEXT,
      dob TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      nationalId TEXT,
      panNumber TEXT,
      aadhaarNumber TEXT,
      occupation TEXT,
      employer TEXT,
      monthlyIncome REAL,
      creditScore INTEGER,
      documentsVerified INTEGER,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      borrowerId TEXT,
      loanType TEXT,
      requestedAmount REAL,
      interestRate REAL,
      tenureMonths INTEGER,
      purpose TEXT,
      emiPreviewAmount REAL,
      status TEXT,
      submissionDate TEXT,
      reviewNotes TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      applicationId TEXT,
      borrowerId TEXT,
      loanType TEXT,
      principalAmount REAL,
      interestRate REAL,
      tenureMonths INTEGER,
      emiAmount REAL,
      startDate TEXT,
      endDate TEXT,
      disbursementDate TEXT,
      outstandingBalance REAL,
      status TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS installments (
      id TEXT PRIMARY KEY,
      loanId TEXT,
      installmentNumber INTEGER,
      dueDate TEXT,
      amountDue REAL,
      principalComponent REAL,
      interestComponent REAL,
      status TEXT,
      paymentDate TEXT,
      paymentMethod TEXT,
      amountPaid REAL,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      entityType TEXT,
      entityId TEXT,
      interactionType TEXT,
      date TEXT,
      notes TEXT,
      outcome TEXT,
      nextFollowUpDate TEXT,
      officerName TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
  `);

  return db;
}

module.exports = getDB;
