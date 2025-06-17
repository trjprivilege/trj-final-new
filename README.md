# Customer Loyalty Program Management System

A comprehensive web application for managing customer loyalty points based on gold purchases. Built with React and Supabase with a robust database schema that handles any CSV format without field size limitations.

## Features

### 🔥 **Robust Data Upload**
- **No more "value too long" errors** - Unlimited field sizes
- Drag & drop CSV upload with live preview
- Automatic points calculation (1 point per 10 grams gold)
- Smart field mapping supports multiple CSV formats
- Automatic date parsing (DD/MM/YYYY format)
- Progress tracking with detailed status messages

### 💎 **Advanced Customer Management**
- Real-time customer search and filtering
- Comprehensive points tracking (total, claimed, unclaimed)
- Elegant point claiming system with validation
- Customer CRUD operations with form validation
- Export data to CSV and print reports
- Mobile-responsive design

### 🎯 **Smart Filtering & Search**
- Search by customer code, name, or mobile
- Date range filtering
- Points range filtering (min/max for total, claimed, unclaimed)
- Claim status filters (has claimed, eligible for claims)
- Advanced pagination with customizable page sizes

### 📊 **Analytics Dashboard**
- Real-time customer statistics
- Points eligibility tracking
- Total points issued/claimed/available
- Comprehensive reporting

## Database Schema

The application uses a robust Supabase database with the following tables:

### `sales_records` Table
- **CUSTOMER CODE** (Primary Key)
- **CUSTOMER NAME** 
- **HOUSE NAME**
- **STREET** 
- **PLACE**
- **PIN CODE**
- **MOBILE**
- **NET WEIGHT** (for points calculation)
- **LAST SALES DATE** (DD/MM/YYYY)
- **LAST_SALES_DATE_PARSED** (auto-parsed date)

### `customer_points` Table
- **CUSTOMER CODE** (Foreign Key)
- **TOTAL_POINTS** (calculated from weight)
- **CLAIMED_POINTS** (user-controlled)
- **UNCLAIMED_POINTS** (auto-calculated)
- **LAST_UPDATED**

### Database Functions
- `refresh_customer_points()` - Recalculates all customer points
- `update_parsed_dates()` - Parses DD/MM/YYYY dates
- `claim_customer_points(customer_code, points)` - Safely claim points

## Getting Started

### Prerequisites
- Node.js 16+
- Supabase account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd trj-final-new
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env.local` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database
Run the provided SQL script to create the robust database schema with all tables, functions, and views.

5. Start the development server
```bash
npm run dev
```

## Usage

### 1. Upload Customer Data
- Go to "Upload Data" tab
- Drag & drop or select your CSV file
- Preview the data and click "Upload & Process Sales Data"
- The system will automatically calculate points and parse dates

### 2. Manage Customers
- Go to "Customer List" tab
- Use search and filters to find specific customers
- Edit customer information as needed
- Claim points for eligible customers (≥10 points)

### 3. Export and Reporting
- Export filtered data to CSV
- Print comprehensive reports
- View real-time analytics

## CSV Format Support

The system accepts various CSV formats with these field mappings:

**Required:**
- CUSTOMER CODE (unique identifier)

**Optional (auto-mapped):**
- CUSTOMER NAME / NAME1 & 2 / Customer Name
- HOUSE NAME / House Name
- STREET / Street
- PLACE / Place
- PIN CODE / Pin Code
- MOBILE / Mobile
- NET WEIGHT / Net Weight (in grams)
- LAST SALES DATE / Last Sales Date

## Points System

- **1 point = 10 grams of gold weight**
- Points are automatically calculated on data upload
- Minimum claim requirement: 10 points
- Points can be claimed in any denomination
- All transactions are tracked with timestamps

## Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Icons:** Lucide React
- **CSV Processing:** PapaParse
- **Authentication:** Supabase Auth

## Security Features

- Row Level Security (RLS) enabled
- User authentication required
- Input validation and sanitization
- SQL injection protection
- Secure file upload handling

## Support

For technical support or questions about the loyalty program system, please contact the development team.

---

*Built with ❤️ for efficient customer loyalty management*


test commit