import { Fingerprint, Activity, Lock } from 'lucide-react';
import './IDCard.css';

interface IDCardProps {
  employeeName: string;
  employeeEmail: string;
  employeeDepartment?: string;
  employeeId: string;
  isActive: boolean;
}

const IDCard = ({ 
  employeeName, 
  employeeEmail, 
  employeeDepartment, 
  employeeId, 
  isActive 
}: IDCardProps) => {
  // Generate initials from employee name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(employeeName);

  return (
    <div className="id-card-container">
      {/* Background with initials */}
      <div className="id-card-background">
        <div className="id-card-initials">{initials}</div>
      </div>

      {/* Card content */}
      <div className="id-card-content">
        <div className="id-card-header">
          <div className="security-badge">
            <Lock size={14} className="security-icon" />
            <span>SECURE ACCESS</span>
          </div>
          <Activity className="status-icon" size={20} />
        </div>

        <div className="id-card-body">
          <div className="user-info">
            <h2 className="user-name">{employeeName.toUpperCase()}</h2>
            {/* <p className="user-role">EMPLOYEE</p> */}
          </div>
        </div>

        <div className="id-card-footer">
          <div className="id-section">
            <span className="label">ID NUMBER</span>
            <span className="value">{employeeId}</span>
          </div>
          <div className="fingerprint-section">
            {/* <Fingerprint size={32} className="fingerprint-icon" /> */}
          </div>
        </div>
      </div>

      {/* Card border */}
      <div className="id-card-border" />
    </div>
  );
};

export default IDCard;
