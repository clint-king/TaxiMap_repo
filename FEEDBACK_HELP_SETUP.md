# Feedback and Help System Setup

This document describes the new feedback and help system features added to the TekeiMap application.

## Features Added

### 1. Feedback System
- **User Feedback Modal**: Users can submit feedback through a modal dialog
- **Feedback Types**: Improvement suggestions, complaints, and general feedback
- **Image Upload**: Support for up to 5 images per feedback submission
- **Feedback History**: Users can view their submitted feedback
- **Admin Management**: Admins can view, respond to, and manage feedback

### 2. Help System
- **FAQ Page**: Comprehensive help page with frequently asked questions
- **Category Filtering**: FAQs organized by categories (general, routes, account, technical, payment)
- **User Questions**: Users can submit questions not covered in FAQs
- **Question History**: Users can view their submitted questions and admin responses
- **Admin Management**: Admins can manage FAQs and answer user questions

## Database Setup

### 1. Run the Migration
Execute the SQL migration file to create the required tables:

```sql
-- Run the contents of backend/migrations/create_feedback_tables.sql
```

This will create:
- `feedback` table for user feedback
- `faqs` table for frequently asked questions
- `user_questions` table for user-submitted questions

### 2. Install Dependencies
Install the new backend dependencies:

```bash
cd backend
npm install multer sequelize
```

## Backend API Endpoints

### Feedback Endpoints
- `POST /feedback/submit` - Submit new feedback
- `GET /feedback/history` - Get user's feedback history
- `GET /feedback/:id` - Get specific feedback by ID

### Help Endpoints
- `GET /help/faqs` - Get all FAQs (public)
- `GET /help/faq-categories` - Get FAQ categories (public)
- `POST /help/submit-question` - Submit a new question
- `GET /help/my-questions` - Get user's question history
- `GET /help/question/:id` - Get specific question by ID

### Admin Endpoints
- `GET /admin/feedback` - Get all feedback for admin
- `PUT /admin/feedback/:id` - Update feedback status/response
- `GET /admin/faqs` - Get all FAQs for admin
- `POST /admin/faqs` - Create new FAQ
- `PUT /admin/faqs/:id` - Update FAQ
- `DELETE /admin/faqs/:id` - Delete FAQ
- `GET /admin/user-questions` - Get all user questions for admin
- `PUT /admin/user-questions/:id` - Answer user question

## Frontend Files Added/Modified

### New Files
- `frontend/help.html` - Help page with FAQ and question submission
- `frontend/css/help.css` - Styles for help page
- `frontend/js/help.js` - JavaScript for help page functionality
- `frontend/js/feedback.js` - JavaScript for feedback modal functionality

### Modified Files
- `frontend/client.html` - Added feedback modal
- `frontend/css/clientStyle.css` - Added feedback modal styles
- `frontend/js/client.js` - Integrated feedback functionality
- Navigation links updated to point to help.html

## Usage

### For Users

1. **Submitting Feedback**:
   - Click the "Feedback" button on the client page
   - Select feedback type (improvement, complaint, general)
   - Fill in subject and message
   - Optionally upload images
   - Submit feedback

2. **Using Help Page**:
   - Navigate to "Help" from the navigation menu
   - Browse FAQs by category
   - Submit questions if needed
   - View your question history

### For Admins

1. **Managing Feedback**:
   - Access feedback through admin endpoints
   - Update status and provide responses
   - View feedback with user information

2. **Managing FAQs**:
   - Create, update, and delete FAQs
   - Organize by categories
   - Set active/inactive status

3. **Answering User Questions**:
   - View all user-submitted questions
   - Provide answers and update status

## File Upload Configuration

The feedback system supports image uploads with the following configuration:
- Maximum file size: 5MB per image
- Maximum images: 5 per feedback
- Allowed formats: JPEG, JPG, PNG, GIF
- Storage location: `backend/uploads/feedback/`

## Security Features

- File type validation for uploads
- File size limits
- User authentication required for submissions
- Admin authentication for management endpoints
- Input validation and sanitization

## Sample Data

The migration includes sample FAQs covering common topics:
- Route finding and suggestions
- Account management
- Technical support
- General information

## Troubleshooting

### Common Issues

1. **File Upload Errors**:
   - Check file size (max 5MB)
   - Ensure file is an image format
   - Verify uploads directory exists

2. **Database Connection**:
   - Ensure migration has been run
   - Check database credentials
   - Verify table creation

3. **Authentication Issues**:
   - Ensure user is logged in for feedback submission
   - Check admin privileges for management endpoints

### Error Handling

The system includes comprehensive error handling:
- User-friendly error messages
- Detailed logging for debugging
- Graceful fallbacks for missing data
- Input validation with helpful feedback
