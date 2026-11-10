import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../core/presentation/widgets/error_view.dart';
import '../../features/import/presentation/cubit/import_cubit.dart';
import '../../features/library/presentation/cubit/library_cubit.dart';
import '../../features/library/presentation/screens/book_details_screen.dart';
import '../../features/library/presentation/screens/library_screen.dart';
import '../../features/reader/presentation/cubit/reader_cubit.dart';
import '../../features/reader/presentation/screens/reader_screen.dart';
import '../../features/search/presentation/cubit/search_cubit.dart';
import '../../features/search/presentation/screens/search_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../di/injection.dart';

/// Application router configuring all declarative routes via [GoRouter].
GoRouter createAppRouter({String initialLocation = '/library'}) {
  return GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(
        path: '/',
        redirect: (_, _) => '/library',
      ),
      GoRoute(
        path: '/library',
        name: 'library',
        builder: (context, state) => MultiBlocProvider(
          providers: [
            BlocProvider<LibraryCubit>(
              create: (_) => getIt<LibraryCubit>()..loadBooks(),
            ),
            BlocProvider<ImportCubit>(
              create: (_) => getIt<ImportCubit>(),
            ),
          ],
          child: const LibraryScreen(),
        ),
      ),
      GoRoute(
        path: '/book/:id',
        name: 'book-details',
        builder: (context, state) {
          final bookId = state.pathParameters['id'] ?? '';
          return BookDetailsScreen(
            bookId: bookId,
            libraryCubit: getIt<LibraryCubit>(),
          );
        },
      ),
      GoRoute(
        path: '/search',
        name: 'search',
        builder: (context, state) {
          final bookId = state.uri.queryParameters['bookId'];
          final initialQuery = state.uri.queryParameters['q'] ?? '';
          return BlocProvider<SearchCubit>(
            create: (_) => getIt<SearchCubit>(param1: bookId),
            child: SearchScreen(
              initialQuery: initialQuery,
              scopedBookId: bookId,
            ),
          );
        },
      ),
      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/reader/:bookId',
        name: 'reader',
        builder: (context, state) {
          final bookId = state.pathParameters['bookId'] ?? '';
          final initialChapterIndexStr = state.uri.queryParameters['chapterIndex'];
          final initialChapterIndex =
              initialChapterIndexStr != null ? int.tryParse(initialChapterIndexStr) : null;
          return BlocProvider<ReaderCubit>(
            create: (_) => getIt<ReaderCubit>(),
            child: ReaderScreen(
              bookId: bookId,
              initialChapterIndex: initialChapterIndex,
            ),
          );
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(title: const Text('Error')),
      body: ErrorView(
        title: 'Route Not Found',
        message: 'Could not navigate to: ${state.uri}',
      ),
    ),
  );
}
