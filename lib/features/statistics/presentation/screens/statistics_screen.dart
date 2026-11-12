import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../../core/presentation/widgets/empty_view.dart';
import '../../../../core/presentation/widgets/error_view.dart';
import '../../../../core/presentation/widgets/loading_view.dart';
import '../../domain/entities/reading_goal_entity.dart';
import '../cubit/statistics_cubit.dart';
import '../cubit/statistics_state.dart';

class StatisticsScreen extends StatelessWidget {
  const StatisticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics & Goals'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_task_rounded),
            tooltip: 'Set Reading Goal',
            onPressed: () => _showAddGoalDialog(context),
          ),
        ],
      ),
      body: BlocBuilder<StatisticsCubit, StatisticsState>(
        builder: (context, state) {
          if (state is StatisticsLoading || state is StatisticsInitial) {
            return const LoadingView(message: 'Loading reading statistics...');
          }

          if (state is StatisticsError) {
            return ErrorView(
              title: 'Statistics Error',
              message: state.message,
              onRetry: () => context.read<StatisticsCubit>().loadStatistics(),
            );
          }

          final loaded = state as StatisticsLoaded;
          final summary = loaded.summary;

          if (summary.totalSessionsCount == 0 && loaded.goals.isEmpty) {
            return EmptyView(
              title: 'No Reading Data Yet',
              message: 'Read novels in the reader to track your reading time, chapter progress, and daily goals.',
              icon: Icons.insights_rounded,
              actionLabel: 'Set a Goal',
              onAction: () => _showAddGoalDialog(context),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Goals Section
              if (summary.goalProgresses.isNotEmpty) ...[
                Text(
                  'Daily Goals',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 8),
                ...summary.goalProgresses.map(
                  (gp) => _GoalProgressCard(
                    progress: gp,
                    onDelete: () =>
                        context.read<StatisticsCubit>().deleteGoal(gp.goal.id),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Overview Cards Grid
              Text(
                'Reading Time Overview',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: colorScheme.primary,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _MetricCard(
                      title: 'Today',
                      value: summary.formattedTodayTime,
                      icon: Icons.today_rounded,
                      color: colorScheme.primaryContainer,
                      textColor: colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _MetricCard(
                      title: 'This Week',
                      value: summary.formattedWeekTime,
                      icon: Icons.date_range_rounded,
                      color: colorScheme.secondaryContainer,
                      textColor: colorScheme.onSecondaryContainer,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _MetricCard(
                      title: 'This Month',
                      value: summary.formattedMonthTime,
                      icon: Icons.calendar_month_rounded,
                      color: colorScheme.tertiaryContainer,
                      textColor: colorScheme.onTertiaryContainer,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _MetricCard(
                      title: 'All Time',
                      value: summary.formattedTotalTime,
                      icon: Icons.all_inclusive_rounded,
                      color: colorScheme.surfaceContainerHighest,
                      textColor: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Activity Distribution (Last 7 Days)
              Text(
                'Last 7 Days Activity',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: colorScheme.primary,
                ),
              ),
              const SizedBox(height: 8),
              _WeeklyActivityChart(dailyBuckets: summary.dailyReadingSeconds),
              const SizedBox(height: 16),

              // Totals Section
              Text(
                'Lifetime Progress',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: colorScheme.primary,
                ),
              ),
              const SizedBox(height: 8),
              Card(
                elevation: 0,
                color: colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.5,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: 12,
                    horizontal: 16,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _StatColumn(
                        label: 'Chapters Read',
                        value: '${summary.totalChaptersCompleted}',
                        icon: Icons.menu_book_rounded,
                      ),
                      _StatColumn(
                        label: 'Sessions',
                        value: '${summary.totalSessionsCount}',
                        icon: Icons.access_time_filled_rounded,
                      ),
                      _StatColumn(
                        label: 'This Year',
                        value: summary.formattedYearTime,
                        icon: Icons.calendar_today_rounded,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Recent Sessions
              if (summary.recentSessions.isNotEmpty) ...[
                Text(
                  'Recent Sessions',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: summary.recentSessions.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final s = summary.recentSessions[index];
                      final dateStr = DateFormat('MMM d, y • h:mm a')
                          .format(s.startTime);
                      final durMin = (s.durationSeconds / 60).toStringAsFixed(
                        1,
                      );
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: colorScheme.primaryContainer,
                          child: Icon(
                            Icons.book_rounded,
                            color: colorScheme.onPrimaryContainer,
                            size: 20,
                          ),
                        ),
                        title: Text('$durMin minutes read'),
                        subtitle: Text(dateStr),
                        trailing: s.chaptersCompleted > 0
                            ? Chip(
                                label: Text('+${s.chaptersCompleted} ch'),
                                visualDensity: VisualDensity.compact,
                              )
                            : null,
                      );
                    },
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  void _showAddGoalDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (dialogCtx) => _AddGoalDialog(
        onSave: (type, target) {
          context.read<StatisticsCubit>().setGoal(
            goalType: type,
            targetValue: target,
          );
        },
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.textColor,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: textColor),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  color: textColor.withValues(alpha: 0.8),
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.bold,
              fontSize: 20,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  const _StatColumn({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Icon(icon, size: 22, color: theme.colorScheme.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _GoalProgressCard extends StatelessWidget {
  const _GoalProgressCard({required this.progress, required this.onDelete});

  final ReadingGoalProgress progress;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isTime = progress.goal.goalType == ReadingGoalType.timeMinutes;

    final title = isTime ? 'Daily Reading Time' : 'Daily Chapters';
    final targetLabel = isTime
        ? '${progress.targetValue} min'
        : '${progress.targetValue} ch';
    final currentLabel = isTime
        ? '${progress.currentValue} min'
        : '${progress.currentValue} ch';
    final percentage = (progress.progressPercentage * 100).toInt();

    return Card(
      elevation: 0,
      color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      progress.isCompleted
                          ? Icons.check_circle_rounded
                          : Icons.flag_rounded,
                      color: progress.isCompleted
                          ? Colors.green
                          : colorScheme.primary,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      title,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 18),
                  tooltip: 'Remove Goal',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: onDelete,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '$currentLabel / $targetLabel',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '$percentage%',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: progress.isCompleted
                        ? Colors.green
                        : colorScheme.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress.progressPercentage,
                minHeight: 8,
                backgroundColor: colorScheme.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation<Color>(
                  progress.isCompleted ? Colors.green : colorScheme.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WeeklyActivityChart extends StatelessWidget {
  const _WeeklyActivityChart({required this.dailyBuckets});

  final Map<DateTime, int> dailyBuckets;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    int maxSeconds = 1;
    for (final s in dailyBuckets.values) {
      if (s > maxSeconds) maxSeconds = s;
    }

    final entries = dailyBuckets.entries.toList();

    return Card(
      elevation: 0,
      color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: entries.map((e) {
            final dayLabel = DateFormat('E').format(e.key);
            final minutes = e.value ~/ 60;
            final ratio = (e.value / maxSeconds).clamp(0.05, 1.0);

            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  minutes > 0 ? '$minutes m' : '-',
                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 10),
                ),
                const SizedBox(height: 4),
                Container(
                  width: 24,
                  height: 70 * ratio,
                  decoration: BoxDecoration(
                    color: e.value > 0
                        ? colorScheme.primary
                        : colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  dayLabel,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _AddGoalDialog extends StatefulWidget {
  const _AddGoalDialog({required this.onSave});

  final void Function(ReadingGoalType type, int target) onSave;

  @override
  State<_AddGoalDialog> createState() => _AddGoalDialogState();
}

class _AddGoalDialogState extends State<_AddGoalDialog> {
  ReadingGoalType _selectedType = ReadingGoalType.timeMinutes;
  final TextEditingController _targetController = TextEditingController(
    text: '30',
  );

  @override
  void dispose() {
    _targetController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Set Daily Reading Goal'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SegmentedButton<ReadingGoalType>(
            segments: const [
              ButtonSegment(
                value: ReadingGoalType.timeMinutes,
                label: Text('Reading Time'),
                icon: Icon(Icons.timer_outlined),
              ),
              ButtonSegment(
                value: ReadingGoalType.chapters,
                label: Text('Chapters'),
                icon: Icon(Icons.bookmark_outline),
              ),
            ],
            selected: {_selectedType},
            onSelectionChanged: (val) {
              setState(() {
                _selectedType = val.first;
                _targetController.text =
                    _selectedType == ReadingGoalType.timeMinutes ? '30' : '2';
              });
            },
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _targetController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: _selectedType == ReadingGoalType.timeMinutes
                  ? 'Target Minutes per Day'
                  : 'Target Chapters per Day',
              border: const OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            final val = int.tryParse(_targetController.text.trim());
            if (val != null && val > 0) {
              widget.onSave(_selectedType, val);
              Navigator.of(context).pop();
            }
          },
          child: const Text('Save Goal'),
        ),
      ],
    );
  }
}
