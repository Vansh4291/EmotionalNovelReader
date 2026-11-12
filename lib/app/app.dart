import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/constants/app_constants.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

/// Root application widget for EmotionalNovelReader.
class EmotionalNovelReaderApp extends StatefulWidget {
  const EmotionalNovelReaderApp({super.key, this.router});

  final GoRouter? router;

  @override
  State<EmotionalNovelReaderApp> createState() =>
      _EmotionalNovelReaderAppState();
}

class _EmotionalNovelReaderAppState extends State<EmotionalNovelReaderApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = widget.router ?? createAppRouter();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      routerConfig: _router,
    );
  }
}
