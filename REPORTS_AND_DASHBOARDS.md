# Reports & Dashboard Enhancements

## Overview
Comprehensive reporting and analytics system with role-based dashboard views.

---

## 🎯 Site Admin Dashboard (`/dashboard`)

### Stats Cards (4 Cards)
1. **Total Providers**
   - Count of all active provider organizations
   - Icon: Building2

2. **Total Referrals**
   - Total count with open/closed breakdown
   - Shows: "X open, Y closed"
   - Icon: FileText

3. **Open Referrals**
   - Count of referrals pending action
   - Highlights urgent items
   - Icon: AlertCircle

4. **Support Tickets**
   - Total count with open breakdown
   - Shows: "X total, Y open"
   - Icon: LifeBuoy

### Features
- Real-time data fetching from `/api/stats/overview`
- Loading states with skeleton loaders
- Error handling
- Auto-updates on page load

---

## 📊 Reports Page (`/dashboard/admin/reports`)

### New Navigation Item
- **Location**: Admin section in sidebar
- **Label**: "Reports"
- **Icon**: BarChart3
- **Route**: `/dashboard/admin/reports`

### Report Sections

#### 1. Recent Activity Card
- **Metric**: Referrals in last 30 days
- **Purpose**: Track platform activity trends
- Prominent display with large number

#### 2. Referrals by Need Category
- **Display**: Vertical list with counts
- **Shows**: Top 10 most requested service categories
- **Purpose**: Identify trending needs
- **Example**:
  ```
  Food Assistance       245
  Housing Support       189
  Medical Services      156
  ```

#### 3. Referrals by Status
- **Display**: Status breakdown with counts
- **Shows**: All status types sorted by count
- **Labels**: User-friendly names (e.g., "Need Addressed" instead of "customer_need_addressed")
- **Purpose**: Track referral lifecycle

#### 4. Top Referrers (Primary Report)
- **Display**: Ranked table (Top 20)
- **Columns**:
  - Rank (#1, #2, etc.)
  - Provider Name
  - Referral Count
- **Purpose**: Identify busiest providers
- **Sorting**: By referral count (descending)

#### 5. Referrals by Source
- **Display**: 3-column grid
- **Shows**: Where referrals originate
- **Sources**:
  - Public Search
  - Direct Entry
  - Other channels
- **Purpose**: Track referral channels

### Data API
- **Endpoint**: `/api/stats/reports`
- **Returns**:
  ```json
  {
    "referralsByCategory": [...],
    "topReferrers": [...],
    "referralsByStatus": [...],
    "referralsBySource": [...],
    "recentActivity": { "last30Days": 123 }
  }
  ```

---

## 🏢 Provider Dashboard (`/dashboard/my-organization`)

### Provider Stats Cards (4 Cards)
1. **Total Referrals**
   - All referrals sent to this provider
   - Icon: FileText (blue)

2. **Pending Referrals**
   - Referrals awaiting action
   - Icon: AlertCircle (yellow)

3. **Completed Referrals**
   - Successfully addressed referrals
   - Icon: CheckCircle (green)

4. **Team Members**
   - Active contacts in organization
   - Icon: Users (purple)

### Features
- Calculated from provider data
- Real-time updates
- Color-coded icons for visual clarity
- Shows relevant metrics only

---

## 📈 Analytics Features

### Metrics Tracked
1. **Provider Count**: Total active organizations
2. **Referral Metrics**:
   - Total count
   - Open vs Closed
   - By status type
   - By need category
   - By source
3. **Support Tickets**:
   - Total count
   - Open vs Closed
4. **Activity Trends**:
   - Last 30 days
   - Growth patterns

### Aggregations
- **Category Aggregation**: Groups referrals by need category name
- **Provider Aggregation**: Counts referrals per provider
- **Status Aggregation**: Counts by referral status
- **Source Aggregation**: Counts by referral source

---

## 🎨 Visual Design

### Color Scheme
- **Blue**: General information (providers, referrals)
- **Yellow**: Pending/warning items
- **Green**: Completed/success items
- **Purple**: Team/user related
- **Orange**: Support tickets

### Card Layout
- Clean, modern design
- Icon + metric + description
- Consistent spacing
- Responsive grid (2-4 columns)

### Tables
- Ranked displays (#1, #2, etc.)
- Right-aligned numbers
- Sortable by count
- Clean typography

---

## 🔐 Permissions

### Site Admin
- ✅ Full dashboard with platform-wide stats
- ✅ Access to Reports page
- ✅ See all metrics and trends

### Provider Admin
- ✅ Provider-specific dashboard
- ✅ Organization metrics only
- ❌ No access to Reports page
- ❌ No platform-wide stats

### Provider User
- ✅ Basic dashboard view
- ✅ Limited metrics (coming soon: personal stats)
- ❌ No access to Reports page

---

## 📡 API Endpoints

### Overview Stats
```
GET /api/stats/overview
Response: {
  providers: { total: number },
  referrals: { total, open, closed },
  supportTickets: { total, open, closed },
  needs: { total }
}
```

### Detailed Reports
```
GET /api/stats/reports
Response: {
  referralsByCategory: Array<{ name, count }>,
  topReferrers: Array<{ id, name, count }>,
  referralsByStatus: Array<{ status, count }>,
  referralsBySource: Array<{ source, count }>,
  recentActivity: { last30Days: number }
}
```

---

## 🚀 Future Enhancements

### Potential Additions
1. **Date Range Filters**: Custom time periods
2. **Export Functionality**: Download reports as CSV/PDF
3. **Charts & Graphs**: Visual data representation
4. **Comparative Analysis**: Month-over-month trends
5. **Provider Leaderboards**: Performance rankings
6. **Custom Dashboards**: User-configurable widgets
7. **Scheduled Reports**: Email digest
8. **Drill-down Views**: Click through to details

### Provider User Dashboard
- Personal referral assignment stats
- Individual performance metrics
- Task completion rates

### Advanced Analytics
- Conversion rates (referral to success)
- Average resolution time
- Provider response rates
- Geographic distribution
- Seasonal trends

---

## 💡 Usage Tips

### For Site Admins
1. Check dashboard daily for platform health
2. Use Reports page for trend analysis
3. Monitor top referrers for engagement
4. Track category trends for resource planning

### For Providers
1. Review pending referrals regularly
2. Monitor completion rate
3. Track team member activity
4. Use stats for internal reporting

---

## 🎯 Key Insights Available

1. **What services are most needed?**
   - See Referrals by Category

2. **Which providers are busiest?**
   - See Top Referrers table

3. **How is platform activity trending?**
   - See Recent Activity (last 30 days)

4. **What's the referral success rate?**
   - Compare open vs closed counts

5. **Where do referrals come from?**
   - See Referrals by Source

6. **How quickly are referrals resolved?**
   - Compare status distribution
