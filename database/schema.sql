-- ============================================================
-- Cloud Lib — Library Management System
-- Database Schema for Amazon RDS MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS cloud_lib;
USE cloud_lib;

-- ── MIGRATION QUERY SCRIPTS (Run these if database already exists) ──
-- ALTER TABLE Users ADD COLUMN StudentID VARCHAR(50) UNIQUE DEFAULT NULL;
-- ALTER TABLE Users ADD COLUMN Phone VARCHAR(20) DEFAULT NULL;
-- ALTER TABLE Users ADD COLUMN Department VARCHAR(100) DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN Description TEXT DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN Category VARCHAR(100) DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN Publisher VARCHAR(150) DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN PublishYear INT DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN CoverImage VARCHAR(255) DEFAULT NULL;
-- ALTER TABLE Reservations MODIFY COLUMN Status ENUM('Pending','Fulfilled','Cancelled','Expired') NOT NULL DEFAULT 'Pending';
-- ALTER TABLE Reservations ADD COLUMN Priority ENUM('Normal','High') NOT NULL DEFAULT 'Normal';
-- ALTER TABLE Reservations ADD COLUMN AdminNote TEXT DEFAULT NULL;

-- ============================================================
-- 1. Users Table
-- ============================================================
CREATE TABLE IF NOT EXISTS Users (
    UserID       INT             AUTO_INCREMENT PRIMARY KEY,
    Name         VARCHAR(100)    NOT NULL,
    Email        VARCHAR(150)    NOT NULL UNIQUE,
    Role         ENUM('Student', 'Admin') NOT NULL DEFAULT 'Student',
    PasswordHash VARCHAR(255)    NOT NULL,
    StudentID    VARCHAR(50)     UNIQUE DEFAULT NULL,
    Phone        VARCHAR(20)     DEFAULT NULL,
    Department   VARCHAR(100)    DEFAULT NULL,
    CreatedAt    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_users_email (Email),
    INDEX idx_users_role  (Role),
    INDEX idx_users_student_id (StudentID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Books Table
-- ============================================================
CREATE TABLE IF NOT EXISTS Books (
    BookID       INT             AUTO_INCREMENT PRIMARY KEY,
    Title        VARCHAR(255)    NOT NULL,
    Author       VARCHAR(200)    NOT NULL,
    ISBN         VARCHAR(20)     NOT NULL UNIQUE,
    Quantity     INT             NOT NULL DEFAULT 0 CHECK (Quantity >= 0),
    Status       ENUM('Available', 'Out of Stock') NOT NULL DEFAULT 'Available',
    Description  TEXT            DEFAULT NULL,
    Category     VARCHAR(100)    DEFAULT NULL,
    Publisher    VARCHAR(150)    DEFAULT NULL,
    PublishYear  INT             DEFAULT NULL,
    CoverImage   VARCHAR(255)    DEFAULT NULL,
    CreatedAt    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_books_isbn   (ISBN),
    INDEX idx_books_title  (Title),
    INDEX idx_books_author (Author)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Borrow Records Table
-- ============================================================
CREATE TABLE IF NOT EXISTS Borrow_Records (
    RecordID      INT           AUTO_INCREMENT PRIMARY KEY,
    UserID        INT           NOT NULL,
    BookID        INT           NOT NULL,
    IssueDate     DATE          NOT NULL DEFAULT (CURRENT_DATE),
    DueDate       DATE          NOT NULL,
    ReturnDate    DATE          NULL,
    ReturnStatus  ENUM('Pending', 'Returned') NOT NULL DEFAULT 'Pending',

    CONSTRAINT fk_borrow_user FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_borrow_book FOREIGN KEY (BookID)
        REFERENCES Books(BookID) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_borrow_user_status (UserID, ReturnStatus),
    INDEX idx_borrow_due         (DueDate),
    INDEX idx_borrow_status      (ReturnStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Reservations Table (Advanced Feature)
-- Now supports Expired status for auto-expiry and Priority levels
-- ============================================================
CREATE TABLE IF NOT EXISTS Reservations (
    ReservationID INT           AUTO_INCREMENT PRIMARY KEY,
    UserID        INT           NOT NULL,
    BookID        INT           NOT NULL,
    RequestDate   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    Status        ENUM('Pending', 'Fulfilled', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Pending',
    Priority      ENUM('Normal', 'High') NOT NULL DEFAULT 'Normal',
    AdminNote     TEXT          DEFAULT NULL,

    CONSTRAINT fk_res_user FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_res_book FOREIGN KEY (BookID)
        REFERENCES Books(BookID) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_res_status (Status),
    INDEX idx_res_user   (UserID),
    INDEX idx_res_date   (RequestDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Seed Data
-- ============================================================

-- Library Admin (password: admin123)
INSERT INTO Users (Name, Email, Role, PasswordHash) VALUES
('Library Admin', 'admin@cloudlib.com', 'Admin', '$2a$10$mwrWHNB3THFHo5ZQv/iMduTsN4dqTYzPLvcwYuCCvXNFrPBCTp9F6')
ON DUPLICATE KEY UPDATE Name=Name;

-- Seed Student (password: student123)
INSERT INTO Users (Name, Email, Role, PasswordHash, StudentID, Phone, Department) VALUES
('Library Student', 'student@cloudlib.com', 'Student', '$2a$10$e7945weGME.ErqZFQIuxquf57Rj5Om3T349gpAc7d1BmnumvKcO3.', 'STU-2026-001', '+1-555-0199', 'Computer Science')
ON DUPLICATE KEY UPDATE Name=Name;

-- More Students (password: student123)
INSERT INTO Users (Name, Email, Role, PasswordHash, StudentID, Phone, Department) VALUES
('John Doe', 'john@cloudlib.com', 'Student', '$2a$10$e7945weGME.ErqZFQIuxquf57Rj5Om3T349gpAc7d1BmnumvKcO3.', 'STU-2026-002', '+1-555-0102', 'Electrical Engineering'),
('Jane Smith', 'jane@cloudlib.com', 'Student', '$2a$10$e7945weGME.ErqZFQIuxquf57Rj5Om3T349gpAc7d1BmnumvKcO3.', 'STU-2026-003', '+1-555-0103', 'Information Technology'),
('Alice Johnson', 'alice@cloudlib.com', 'Student', '$2a$10$e7945weGME.ErqZFQIuxquf57Rj5Om3T349gpAc7d1BmnumvKcO3.', 'STU-2026-004', '+1-555-0104', 'Mathematics')
ON DUPLICATE KEY UPDATE Name=Name;

-- Sample books
INSERT INTO Books (Title, Author, ISBN, Quantity, Status, Description, Category, Publisher, PublishYear, CoverImage) VALUES
('Clean Code', 'Robert C. Martin', '978-0132350884', 5, 'Available', 'A handbook of agile software craftsmanship that helps developers write clean, maintainable, and elegant code.', 'Programming', 'Prentice Hall', 2008, 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg'),
('The Pragmatic Programmer', 'David Thomas', '978-0135957059', 3, 'Available', 'One of the most significant books on software development, covering coding standards, tool use, and career development.', 'Software Engineering', 'Addison-Wesley', 1999, 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg'),
('Design Patterns', 'Erich Gamma', '978-0201633610', 2, 'Available', 'The classic guide to object-oriented programming design patterns, illustrating concepts with simple design options.', 'Design Patterns', 'Addison-Wesley', 1994, 'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg'),
('Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848', 4, 'Available', 'A comprehensive textbook covering the analysis and design of algorithms, standard in computer science education.', 'Algorithms', 'MIT Press', 2009, 'https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg'),
('Database System Concepts', 'Abraham Silberschatz', '978-0078022159', 3, 'Available', 'A fundamental book on database management systems, covering relational databases, query languages, and database design.', 'Databases', 'McGraw-Hill', 2010, 'https://covers.openlibrary.org/b/isbn/9780078022159-L.jpg'),
('Computer Networking', 'James Kurose', '978-0133594140', 6, 'Available', 'A top-down approach to computer networking, explaining protocols and architecture from the application layer down.', 'Networking', 'Pearson', 2012, 'https://covers.openlibrary.org/b/isbn/9780133594140-L.jpg'),
('Artificial Intelligence', 'Stuart Russell', '978-0136042594', 2, 'Available', 'The standard textbook on artificial intelligence, describing search, logic, machine learning, and neural networks.', 'Artificial Intelligence', 'Pearson', 2009, 'https://covers.openlibrary.org/b/isbn/9780136042594-L.jpg'),
('Operating System Concepts', 'Abraham Silberschatz', '978-1118063330', 4, 'Available', 'A core textbook on operating system design, covering processes, memory management, file systems, and security.', 'Operating Systems', 'Wiley', 2012, 'https://covers.openlibrary.org/b/isbn/9781118063330-L.jpg')
ON DUPLICATE KEY UPDATE Title=Title;

-- More books
INSERT INTO Books (Title, Author, ISBN, Quantity, Status, Description, Category, Publisher, PublishYear, CoverImage) VALUES
('Refactoring', 'Martin Fowler', '978-0134757599', 3, 'Available', 'Improving the design of existing code. A guide to restructuring code without changing external behavior.', 'Software Engineering', 'Addison-Wesley', 2018, 'https://covers.openlibrary.org/b/isbn/9780134757599-L.jpg'),
('Designing Data-Intensive Applications', 'Martin Kleppmann', '978-1449373320', 4, 'Available', 'The big ideas behind reliable, scalable, and maintainable systems, covering data models, storage, processing, and networking.', 'Databases', 'O\'Reilly Media', 2017, 'https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg'),
('You Dont Know JS Yet', 'Kyle Simpson', '978-1950326044', 6, 'Available', 'An essential guide to the core foundations of the JS language, exploring scoping, closures, and object prototypes.', 'Programming', 'Getify Solutions', 2020, 'https://covers.openlibrary.org/b/isbn/9781950326044-L.jpg'),
('The Clean Coder', 'Robert C. Martin', '978-0137081073', 4, 'Available', 'A code of conduct for professional programmers, detailing standards, expectations, and ethics.', 'Software Engineering', 'Prentice Hall', 2011, 'https://covers.openlibrary.org/b/isbn/9780137081073-L.jpg'),
('Cracking the Coding Interview', 'Gayle Laakmann McDowell', '978-0984782857', 5, 'Available', '189 programming questions and solutions, covering algorithms, data structures, and behavioral interview preparation.', 'Algorithms', 'CareerCup', 2015, 'https://covers.openlibrary.org/b/isbn/9780984782857-L.jpg'),
('Head First Design Patterns', 'Eric Freeman', '978-1492078005', 2, 'Available', 'A brain-friendly guide to object-oriented patterns, showing how to create flexible, elegant, and reusable code.', 'Design Patterns', 'O\'Reilly Media', 2020, 'https://covers.openlibrary.org/b/isbn/9781492078005-L.jpg')
ON DUPLICATE KEY UPDATE Title=Title;

-- Add Borrow Records (active and returned)
INSERT INTO Borrow_Records (UserID, BookID, IssueDate, DueDate, ReturnDate, ReturnStatus) VALUES
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), NULL, 'Pending'),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 15 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), NULL, 'Pending'), -- Overdue loan
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 9 DAY), NULL, 'Pending'),
(4, 4, DATE_SUB(CURRENT_DATE, INTERVAL 20 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY), 'Returned')
ON DUPLICATE KEY UPDATE RecordID=RecordID;

-- Add Reservations
INSERT INTO Reservations (UserID, BookID, RequestDate, Status, Priority, AdminNote) VALUES
(2, 6, CURRENT_TIMESTAMP, 'Pending', 'Normal', NULL),
(3, 5, CURRENT_TIMESTAMP, 'Pending', 'High', 'Urgent exam preparation request'),
(4, 2, CURRENT_TIMESTAMP, 'Pending', 'Normal', NULL)
ON DUPLICATE KEY UPDATE ReservationID=ReservationID;
