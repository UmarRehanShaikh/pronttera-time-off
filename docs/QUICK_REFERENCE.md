# Quick Reference Guide

> **Last Updated:** February 03, 2026
> **Purpose:** Quick access to key system information

---

## 🚀 Quick Access Links

### **System Access**
- **Production URL:** https://app.pronttera.com
- **Development URL:** http://localhost:8080
- **Admin Panel:** /admin/dashboard
- **Manager Panel:** /pending
- **Employee Portal:** /dashboard

### **Support Links**
- **Documentation:** /docs/SYSTEM_DOCUMENTATION.md
- **Change Log:** /docs/CHANGELOG.md
- **Support Email:** support@pronttera.com
- **Emergency:** emergency@pronttera.com

---

## 👥 User Roles - Quick Summary

| Role | Access Level | Key Permissions |
|------|-------------|----------------|
| **Admin** | Full System | User management, all approvals, settings |
| **Manager** | Department | Team approvals, team analytics |
| **Employee** | Self-Service | Personal leave, profile management |
| **Intern** | Limited | Basic self-service features |

---

## 📊 Module Access Matrix

| Module | Admin | Manager | Employee | Intern |
|--------|-------|---------|----------|---------|
| Dashboard | 🟢 | 🟡 | 🟡 | 🟡 |
| User Management | 🟢 | 🔒 | 🔒 | 🔒 |
| Leave Management | 🟢 | 🟡 | 🟡 | 🟡 |
| Attendance | 🟢 | 🟡 | 🟡 | 🟡 |
| Team Calendar | 🟢 | 🟡 | 🟡 | 🟡 |
| Company Holidays | 🟢 | 🟡 | 🟡 | 🟡 |
| ID Cards | 🟢 | 🟡 | 🟡 | 🟡 |
| Settings | 🟢 | ❌ | ❌ | ❌ |

**Legend:** 🟢 Full | 🟡 Limited | 🔒 Self | ❌ None

---

## 🔧 Common Workflows

### **Employee Leave Request**
1. Login → Dashboard
2. Click "Apply Leave"
3. Select leave type and dates
4. Add reason
5. Submit
6. Wait for manager approval

### **Manager Leave Approval**
1. Login → Pending Requests
2. Review request details
3. Check team calendar
4. Approve/Reject with comments
5. System notifies employee

### **Admin User Creation**
1. Login → User Management
2. Click "Add Employee"
3. Fill details
4. Assign role and department
5. Save
6. Generate ID card

---

## 📱 Mobile Access

### **PWA Features**
- **Offline Mode:** Limited functionality
- **Push Notifications:** Leave approvals, reminders
- **Touch Optimized:** Mobile-friendly interface
- **Biometric Login:** Fingerprint/Face ID

### **Mobile Limitations**
- No document upload
- Limited reporting features
- Basic dashboard view
- No admin settings

---

## 🔐 Security Quick Tips

### **For Users**
- Use strong passwords
- Don't share credentials
- Log out after use
- Report suspicious activity

### **For Admins**
- Regular access reviews
- Monitor failed logins
- Update user roles promptly
- Backup critical data

---

## 🚨 Emergency Procedures

### **System Outage**
1. Check status page: status.pronttera.com
2. Contact: emergency@pronttera.com
3. Use offline forms if available
4. Document impact

### **Security Incident**
1. Immediately contact: security@pronttera.com
2. Change all passwords
3. Review access logs
4. Document timeline

---

## 📞 Contact Directory

### **Primary Contacts**
- **System Admin:** admin@pronttera.com
- **HR Support:** hr@pronttera.com
- **Technical Support:** support@pronttera.com
- **Emergency:** emergency@pronttera.com

### **Department Contacts**
- **IT Helpdesk:** it@pronttera.com
- **Finance:** finance@pronttera.com
- **Operations:** ops@pronttera.com

---

## 📋 Quick Commands

### **Development Commands**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Check code quality
npm run lint
```

### **Database Commands**
```bash
# Backup database
supabase db dump

# Restore database
supabase db restore

# Run migrations
supabase db push
```

---

## 🎯 Performance Tips

### **For Users**
- Use modern browsers (Chrome, Firefox, Safari)
- Clear cache regularly
- Use stable internet connection
- Close unused tabs

### **For Admins**
- Monitor system performance
- Regular database maintenance
- Optimize file uploads
- Monitor user activity

---

## 📊 System Limits

| Feature | Limit | Notes |
|---------|-------|-------|
| File Upload | 10MB | Per file |
| Leave Requests | Unlimited | Per user |
| Concurrent Users | 1000 | System limit |
| Data Retention | 7 years | As per policy |
| Session Timeout | 30 mins | Inactivity |

---

## 🔄 Update Schedule

### **Regular Updates**
- **Security Patches:** As needed
- **Feature Updates:** Monthly
- **Documentation:** Weekly
- **Backups:** Daily

### **Maintenance Windows**
- **Planned:** Sunday 2-4 AM
- **Emergency:** As needed
- **Notification:** 48 hours notice

---

*This quick reference guide is updated automatically with system changes. For detailed information, refer to the main system documentation.*
