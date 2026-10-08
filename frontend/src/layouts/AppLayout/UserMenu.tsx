import Dropdown from 'react-bootstrap/Dropdown';
import { Link, useNavigate } from 'react-router';

import { useToast } from '@/components/feedback/useToast';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth/useAuth';
import { ROUTES } from '@/routes/paths';

import styles from './AppLayout.module.css';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    showToast({ variant: 'info', message: 'You have been signed out.' });
    void navigate(ROUTES.login, { replace: true });
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="link" className={styles.userToggle} id="user-menu">
        <Avatar name={user.name} size="sm" decorative />
        <span className="d-none d-md-inline">{user.name}</span>
        <span className="visually-hidden d-md-none">Account menu for {user.name}</span>
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Header>
          <span className="d-block fw-semibold text-body">{user.name}</span>
          <span className="d-block small">{user.email}</span>
          <span className="badge text-bg-secondary mt-1">{user.role.name}</span>
        </Dropdown.Header>
        <Dropdown.Divider />
        <Dropdown.Item as={Link} to={ROUTES.account}>
          <Icon name="person" className="me-2" />
          Profile &amp; security
        </Dropdown.Item>
        <Dropdown.Item as="button" onClick={handleLogout}>
          <Icon name="box-arrow-right" className="me-2" />
          Sign out
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
