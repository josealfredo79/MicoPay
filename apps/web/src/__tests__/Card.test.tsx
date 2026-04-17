import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardContent } from '../components/ui/Card';

describe('Card Component', () => {
  it('renders children', () => {
    render(<Card><CardContent><p>Card Content</p></CardContent></Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <Card onClick={handleClick}>
        <CardContent><p>Clickable Card</p></CardContent>
      </Card>
    );
    screen.getByText('Clickable Card').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
