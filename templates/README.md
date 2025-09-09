# Email Templates

This directory contains Handlebars email templates for the Asset Management System.

## Available Templates

### 1. `welcome.hbs`
- **Purpose**: Welcome email sent to users when they register for an event
- **Variables**:
  - `{{attendeeName}}` - Name of the attendee
  - `{{eventName}}` - Name of the event
  - `{{ticketCode}}` - Unique ticket code
  - `{{email}}` - User's email address
  - `{{qrUrl}}` - URL to QR code image (optional)
  - `{{currentYear}}` - Current year

### 2. `checkin-success.hbs`
- **Purpose**: Confirmation email sent after successful check-in
- **Variables**:
  - `{{attendeeName}}` - Name of the attendee
  - `{{eventName}}` - Name of the event
  - `{{checkedInAt}}` - Check-in timestamp
  - `{{ticketCode}}` - Unique ticket code
  - `{{currentYear}}` - Current year

### 3. `reset-password.hbs`
- **Purpose**: Password reset email for system users
- **Variables**:
  - `{{userName}}` - Name of the user
  - `{{resetUrl}}` - Password reset URL
  - `{{expiresIn}}` - Link expiration time
  - `{{currentYear}}` - Current year

## Template Usage

Templates are processed using Handlebars.js and sent via Nodemailer. They support:
- Variables: `{{variableName}}`
- Conditionals: `{{#if condition}}...{{/if}}`
- Loops: `{{#each items}}...{{/each}}`
- Helpers: Standard Handlebars helpers

## Styling Guidelines

- Use inline CSS for maximum email client compatibility
- Keep max-width around 600px for mobile responsiveness
- Use web-safe fonts (Arial, sans-serif)
- Test templates across different email clients

## Adding New Templates

1. Create a new `.hbs` file in this directory
2. Follow the existing naming convention (kebab-case)
3. Include proper HTML structure with inline CSS
4. Document variables and usage in this README
5. Update the email service to use the new template
