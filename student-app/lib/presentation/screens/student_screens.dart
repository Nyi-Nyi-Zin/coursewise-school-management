import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/student_session_scope.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _AuthLayout(
        icon: Icons.login_rounded,
        title: 'Welcome back',
        subtitle: 'Sign in to continue your learning day.',
        form: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.email_outlined)),
                validator: (value) => !(value ?? '').contains('@') ? 'Enter a valid email address' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _password,
                obscureText: _obscure,
                onFieldSubmitted: (_) => _login(),
                decoration: _passwordDecoration('Password'),
                validator: (value) => (value ?? '').isEmpty ? 'Enter your password' : null,
              ),
              const SizedBox(height: 22),
              _SubmitButton(label: 'Sign in', busyLabel: 'Signing in…', busy: _busy, onPressed: _login),
              const SizedBox(height: 12),
              TextButton(onPressed: _busy ? null : () => context.go('/register'), child: const Text('New student? Create an account')),
            ],
          ),
        ),
      );

  InputDecoration _passwordDecoration(String label) => InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.lock_outline),
        suffixIcon: IconButton(
          icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
          onPressed: () => setState(() => _obscure = !_obscure),
        ),
      );

  Future<void> _login() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      await StudentSessionScope.of(context).login(email: _email.text, password: _password.text);
      if (mounted) context.go('/home');
    } on FormatException catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  bool _obscure = true;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _AuthLayout(
        icon: Icons.school_rounded,
        title: 'Create your account',
        subtitle: 'Register once on this device, then sign in whenever you return.',
        form: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _name,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline)),
                validator: (value) => (value ?? '').trim().length < 2 ? 'Enter your full name' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.email_outlined)),
                validator: (value) => !(value ?? '').contains('@') ? 'Enter a valid email address' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _password,
                obscureText: _obscure,
                textInputAction: TextInputAction.next,
                decoration: _passwordDecoration('Password'),
                validator: (value) => (value ?? '').length < 6 ? 'Use at least 6 characters' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _confirm,
                obscureText: _obscure,
                onFieldSubmitted: (_) => _register(),
                decoration: const InputDecoration(labelText: 'Confirm password', prefixIcon: Icon(Icons.lock_reset_outlined)),
                validator: (value) => value != _password.text ? 'Passwords do not match' : null,
              ),
              const SizedBox(height: 22),
              _SubmitButton(label: 'Create account', busyLabel: 'Creating account…', busy: _busy, onPressed: _register),
              const SizedBox(height: 12),
              TextButton(onPressed: _busy ? null : () => context.go('/login'), child: const Text('Already registered? Sign in')),
            ],
          ),
        ),
      );

  InputDecoration _passwordDecoration(String label) => InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.lock_outline),
        suffixIcon: IconButton(
          icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
          onPressed: () => setState(() => _obscure = !_obscure),
        ),
      );

  Future<void> _register() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      await StudentSessionScope.of(context).register(name: _name.text, email: _email.text, password: _password.text);
      if (mounted) context.go('/home');
    } on FormatException catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _AuthLayout extends StatelessWidget {
  const _AuthLayout({required this.icon, required this.title, required this.subtitle, required this.form});
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget form;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(icon, size: 56, color: const Color(0xFF143D36)),
                    const SizedBox(height: 20),
                    Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 8),
                    Text(subtitle, textAlign: TextAlign.center),
                    const SizedBox(height: 28),
                    form,
                    const SizedBox(height: 16),
                    Text(StudentSessionScope.of(context).usingFirebase ? 'Your account is secured with Firebase Authentication.' : 'Firebase will be used automatically after Android project configuration is added.', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

class _SubmitButton extends StatelessWidget {
  const _SubmitButton({required this.label, required this.busyLabel, required this.busy, required this.onPressed});
  final String label;
  final String busyLabel;
  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: double.infinity,
        child: FilledButton(
          onPressed: busy ? null : onPressed,
          child: Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(busy ? busyLabel : label)),
        ),
      );
}

class StudentScaffold extends StatelessWidget {
  const StudentScaffold({required this.title, required this.child, super.key});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(title)),
        body: SafeArea(child: child),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index(context),
          onDestinationSelected: (index) => context.go(['/home', '/lessons', '/quizzes', '/profile'][index]),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
            NavigationDestination(icon: Icon(Icons.menu_book_outlined), label: 'Lessons'),
            NavigationDestination(icon: Icon(Icons.fact_check_outlined), label: 'Quizzes'),
            NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
          ],
        ),
      );

  int _index(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    if (path.startsWith('/lessons')) return 1;
    if (path.startsWith('/quizzes')) return 2;
    if (path.startsWith('/profile')) return 3;
    return 0;
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) => StudentScaffold(
        title: 'Teza Tech Lab',
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Card(
              color: const Color(0xFF143D36),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('STUDENT HOME', style: TextStyle(color: Color(0xFFD4F59B))),
                  const SizedBox(height: 10),
                  Text('Welcome back, ${StudentSessionScope.of(context).name}.', style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  const Text('Your learning space is ready.', style: TextStyle(color: Colors.white70)),
                ]),
              ),
            ),
            const SizedBox(height: 20),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                MenuTile(icon: Icons.menu_book_outlined, label: 'Lessons', onTap: () => context.go('/lessons')),
                MenuTile(icon: Icons.fact_check_outlined, label: 'Quizzes', onTap: () => context.go('/quizzes')),
                MenuTile(icon: Icons.assignment_outlined, label: 'Assignments', onTap: () => context.go('/assignments')),
                MenuTile(icon: Icons.calendar_month_outlined, label: 'Attendance', onTap: () => context.go('/attendance')),
              ],
            ),
          ],
        ),
      );
}

class LessonsScreen extends StatelessWidget { const LessonsScreen({super.key}); @override Widget build(BuildContext context) => const StudentScaffold(title: 'Lessons', child: EmptyNotice(title: 'Published lesson resources will appear here.')); }
class QuizzesScreen extends StatelessWidget { const QuizzesScreen({super.key}); @override Widget build(BuildContext context) => const StudentScaffold(title: 'Quizzes', child: EmptyNotice(title: 'Published quizzes will appear here.')); }
class QuizSessionScreen extends StatelessWidget { const QuizSessionScreen({required this.quizId, super.key}); final String quizId; @override Widget build(BuildContext context) => StudentScaffold(title: 'Take quiz', child: EmptyNotice(title: 'Quiz $quizId will load after Firebase is connected.')); }
class AttendanceScreen extends StatelessWidget { const AttendanceScreen({super.key}); @override Widget build(BuildContext context) => const StudentScaffold(title: 'Attendance', child: EmptyNotice(title: 'Attendance records will appear here.')); }
class AssignmentsScreen extends StatelessWidget { const AssignmentsScreen({super.key}); @override Widget build(BuildContext context) => const StudentScaffold(title: 'Assignments', child: EmptyNotice(title: 'No assignments available.')); }
class ProfileScreen extends StatelessWidget { const ProfileScreen({super.key}); @override Widget build(BuildContext context) { final session = StudentSessionScope.of(context); return StudentScaffold(title: 'Profile', child: ListView(padding: const EdgeInsets.all(20), children: [Card(child: ListTile(leading: CircleAvatar(child: Text(session.initials)), title: Text(session.name), subtitle: Text(session.email), trailing: const Icon(Icons.verified_user_outlined))), const SizedBox(height: 16), OutlinedButton.icon(onPressed: () async { await session.signOut(); if (context.mounted) context.go('/login'); }, icon: const Icon(Icons.logout), label: const Text('Sign out'))])); } }

class MenuTile extends StatelessWidget { const MenuTile({required this.icon, required this.label, required this.onTap, super.key}); final IconData icon; final String label; final VoidCallback onTap; @override Widget build(BuildContext context) => Card(child: InkWell(onTap: onTap, child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(icon, color: const Color(0xFF143D36)), const SizedBox(height: 8), Text(label)])))); }
class EmptyNotice extends StatelessWidget { const EmptyNotice({required this.title, super.key}); final String title; @override Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(32), child: Text(title, textAlign: TextAlign.center))); }
