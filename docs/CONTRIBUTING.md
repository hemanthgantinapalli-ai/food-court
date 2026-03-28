# Contributing to FoodCourt

Thank you for your interest in contributing to FoodCourt! This guide will help you understand our development process and standards.

## Code Style Guidelines

### JavaScript/React
- Use ES6+ syntax (classes, arrow functions, destructuring)
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused
- Use const/let instead of var

### Example
```javascript
// Good
const handleAddToCart = async (restaurantId, menuItemId) => {
  try {
    const response = await API.post('/cart/add', {
      restaurantId,
      menuItemId,
    });
    return response.data;
  } catch (error) {
    console.error('Cart error:', error);
    throw error;
  }
};

// Avoid
var result = func();
```

## Git Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Commit with clear messages:
   ```bash
   git commit -m "feat: add user authentication"
   ```

4. Push to branch:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a Pull Request

## Commit Message Format

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for code formatting
- `refactor:` for code restructuring
- `test:` for adding tests

## Testing Requirements

- Write tests for new features
- Ensure existing tests pass
- Test with multiple browsers

## Component Structure

```javascript
// Always import React
import React from 'react';
import { useEffect, useState } from 'react';

// Functional components preferred
export default function ComponentName({ prop1, prop2 }) {
  const [state, setState] = useState('');

  useEffect(() => {
    // Side effects here
  }, []);

  return (
    <div>
      {/* JSX here */}
    </div>
  );
}
```

## Naming Conventions

- Components: PascalCase (UserProfile)
- Variables/functions: camelCase (getUserData)
- Constants: CAPITAL_SNAKE_CASE (API_BASE_URL)
- CSS classes: kebab-case (user-profile)

## Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No console errors/warnings
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Responsive design tested
- [ ] Accessibility considered

---

Happy coding! 🚀
