# 🤝 Contributing to EchoTrail

First off, thank you for considering contributing to EchoTrail! It's people like you that make EchoTrail such a great tool for Norwegian hiking enthusiasts. 🏔️

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@echotrail.no](mailto:conduct@echotrail.no).

### Our Pledge

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what's best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Git
- A GitHub account
- Familiarity with React Native and TypeScript

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/ECHOTRAIL.git
   cd ECHOTRAIL
   ```
3. **Add the original repository** as upstream:
   ```bash
   git remote add upstream https://github.com/KentHenriks1/ECHOTRAIL.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```
6. **Run the development server**:
   ```bash
   npx expo start
   ```

## 💡 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating a bug report, please check the [existing issues](https://github.com/KentHenriks1/ECHOTRAIL/issues) to see if the problem has already been reported.

When you create a bug report, please use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml) and include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots or videos if applicable
- Device and version information
- Error logs or stack traces

### 🚀 Suggesting Features

Feature requests are welcome! Please use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml) and include:

- A clear description of the problem you're trying to solve
- A detailed description of your proposed solution
- Any alternative solutions you've considered
- Mockups or examples if applicable

### 🔧 Contributing Code

We welcome code contributions! Here are the types of contributions we're looking for:

#### 🎯 Priority Areas

- **AI Storytelling**: Improve story generation and personalization
- **Performance**: Optimize app performance and reduce bundle size
- **Accessibility**: Make the app more accessible to users with disabilities
- **Internationalization**: Add support for more languages
- **Testing**: Improve test coverage and add integration tests

#### 🏗️ Types of Contributions

- **Bug fixes**: Fix reported issues
- **New features**: Implement requested features
- **Documentation**: Improve or add documentation
- **Refactoring**: Improve code quality and structure
- **Performance improvements**: Make the app faster
- **UI/UX improvements**: Enhance the user experience

## 🔄 Development Process

### Branch Strategy

We use **GitHub Flow** with the following conventions:

- `main`: Production-ready code
- `feature/feature-name`: New features
- `bugfix/issue-description`: Bug fixes
- `chore/task-description`: Maintenance tasks
- `docs/documentation-update`: Documentation updates

### Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with clear, focused commits

3. **Write or update tests** for your changes

4. **Run tests** to ensure everything works:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. **Commit your changes** using conventional commit messages:
   ```bash
   git commit -m "feat: add AI story personalization"
   git commit -m "fix: resolve GPS accuracy issue"
   git commit -m "docs: update API documentation"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** using our [PR template](.github/PULL_REQUEST_TEMPLATE.md)

## 📝 Style Guidelines

### TypeScript Code Style

- Use **TypeScript** for all new code
- Follow the existing **ESLint** and **Prettier** configuration
- Use **meaningful variable and function names**
- Add **JSDoc comments** for public APIs
- Prefer **functional components** and **hooks**

```typescript
// Good
interface TrailLocation {
  latitude: number;
  longitude: number;
  elevation?: number;
}

const getTrailDistance = (start: TrailLocation, end: TrailLocation): number => {
  // Implementation here
};

// Bad
const calc = (a: any, b: any) => {
  // Implementation here
};
```

### React Native Conventions

- Use **functional components** with hooks
- Follow **React Native best practices**
- Use **TypeScript interfaces** for props
- Implement **proper error boundaries**
- Use **memo** for performance optimization when needed

```typescript
// Good
interface TrailCardProps {
  trail: Trail;
  onPress: (trail: Trail) => void;
  isLoading?: boolean;
}

const TrailCard: React.FC<TrailCardProps> = ({ trail, onPress, isLoading = false }) => {
  // Component implementation
};

export default memo(TrailCard);
```

### File and Directory Organization

- Use **kebab-case** for file names: `trail-card.component.tsx`
- Use **PascalCase** for component files: `TrailCard.tsx`
- Group related files in directories
- Use **barrel exports** (`index.ts`) for clean imports

```
src/components/trails/
├── TrailCard.tsx
├── TrailList.tsx
├── TrailSearch.tsx
└── index.ts
```

### Git Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding or updating tests
- `chore:` maintenance tasks

Examples:
```
feat(ai): add story personalization based on user interests
fix(maps): resolve GPS accuracy issue on Android devices
docs(readme): update installation instructions
```

## 🧪 Testing

### Testing Requirements

All contributions must include appropriate tests:

- **Unit tests** for utilities and services
- **Integration tests** for complex workflows
- **Component tests** for React components
- **E2E tests** for critical user flows (when applicable)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test TrailService.test.ts

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Writing Tests

Use **Jest** and **React Native Testing Library**:

```typescript
// Good test example
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TrailCard } from '../TrailCard';
import { mockTrail } from '../../__mocks__/trail.mock';

describe('TrailCard', () => {
  it('should call onPress when card is tapped', async () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <TrailCard trail={mockTrail} onPress={mockOnPress} />
    );

    fireEvent.press(getByTestId('trail-card'));
    
    await waitFor(() => {
      expect(mockOnPress).toHaveBeenCalledWith(mockTrail);
    });
  });
});
```

## 📤 Submitting Changes

### Pull Request Process

1. **Fill out the PR template** completely
2. **Link related issues** using GitHub keywords (e.g., "Fixes #123")
3. **Request review** from relevant maintainers
4. **Address feedback** promptly and professionally
5. **Ensure CI passes** (tests, linting, type checking)

### PR Review Criteria

Your PR will be reviewed for:

- **Functionality**: Does it work as intended?
- **Code Quality**: Is it well-written and maintainable?
- **Testing**: Are there adequate tests?
- **Documentation**: Is documentation updated if needed?
- **Performance**: Does it maintain or improve performance?
- **Security**: Are there any security concerns?

### After Your PR is Merged

1. **Delete your feature branch**:
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

2. **Update your main branch**:
   ```bash
   git checkout main
   git pull upstream main
   ```

## 🆘 Getting Help

### Communication Channels

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Discord**: [Join our community](https://discord.gg/echotrail)
- **Email**: [dev@echotrail.no](mailto:dev@echotrail.no)

### Mentorship

New contributors are welcome! If you're new to:

- **React Native**: Check out the [official documentation](https://reactnative.dev/)
- **TypeScript**: Try the [TypeScript handbook](https://www.typescriptlang.org/docs/)
- **Git**: Learn [Git basics](https://git-scm.com/doc)
- **Open Source**: Read [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)

Don't hesitate to ask questions or request help!

## 🏆 Recognition

Contributors will be recognized in:

- **README.md** acknowledgments
- **CHANGELOG.md** for significant contributions
- **GitHub contributor list**
- **Annual contributor awards** (coming soon!)

## 📄 License

By contributing to EchoTrail, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers the project.

---

**Thank you for contributing to EchoTrail!** 🏔️⭐

Every contribution, no matter how small, helps make EchoTrail better for Norwegian hiking enthusiasts worldwide.