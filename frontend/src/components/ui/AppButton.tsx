import Button, { type ButtonProps } from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

import { Icon, type IconName } from './Icon';

export interface AppButtonProps extends ButtonProps {
  /** Shows a spinner, disables the button and sets aria-busy. */
  isLoading?: boolean;
  /** Optional text to show while loading (defaults to the normal label). */
  loadingText?: string;
  icon?: IconName;
}

/** Bootstrap button with consistent loading and icon handling. */
export function AppButton({
  isLoading = false,
  loadingText,
  icon,
  children,
  disabled,
  ...buttonProps
}: AppButtonProps) {
  const hasLabel = children !== undefined && children !== null;
  return (
    <Button disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...buttonProps}>
      {isLoading ? (
        <Spinner
          as="span"
          animation="border"
          size="sm"
          className={hasLabel ? 'me-2' : undefined}
          aria-hidden="true"
        />
      ) : (
        icon && <Icon name={icon} className={hasLabel ? 'me-2' : undefined} />
      )}
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}
