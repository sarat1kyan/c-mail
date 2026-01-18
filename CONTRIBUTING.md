# Contributing to C-Mail Intelligence

Thank you for your interest in contributing to C-Mail Intelligence! 🎉

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/c-mail.git
   cd c-mail
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 💻 Development

```bash
# Run in development mode
npm run dev

# Run only the React frontend (for UI work)
npm run dev:vite

# Run linting
npm run lint

# Build for production
npm run build
```

## 📝 Code Guidelines

### General
- Write clear, readable code with meaningful variable/function names
- Add comments for complex logic
- Keep functions small and focused
- Use TypeScript types appropriately

### React Components
- Use functional components with hooks
- Follow the existing file/folder structure
- Use Tailwind CSS for styling
- Keep components in their appropriate folders

### Electron/Backend
- All email processing must happen locally
- Never send email content to external servers
- Handle errors gracefully
- Add proper TypeScript types

## 🔒 Privacy First

**This is critical:** C-Mail is a privacy-focused application. Any contribution must:

- ✅ Process all data locally on the user's device
- ✅ Never send email content to external servers
- ✅ Use secure storage for credentials
- ❌ Never add analytics or tracking
- ❌ Never add cloud processing dependencies

## 📋 Pull Request Process

1. **Update documentation** if needed (README, comments, etc.)
2. **Test your changes** thoroughly
3. **Write a clear PR description** explaining what changes were made and why
4. **Reference any related issues** using `#issue-number`
5. **Ensure no linting errors** (`npm run lint`)

### PR Title Format
- `feat: Add new feature description`
- `fix: Fix bug description`
- `docs: Update documentation`
- `refactor: Refactor component/module`
- `style: UI/styling changes`
- `chore: Maintenance tasks`

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description** of the bug
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots** if applicable
6. **Environment** (OS, Node version, etc.)

## 💡 Feature Requests

Feature requests are welcome! Please:

1. Check if the feature was already requested
2. Describe the feature clearly
3. Explain the use case
4. Consider privacy implications

## 📜 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a positive environment

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make C-Mail Intelligence better! 🚀

