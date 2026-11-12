import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/tts_cubit.dart';
import '../cubit/tts_state.dart';

class TtsControlSheet extends StatelessWidget {
  const TtsControlSheet({super.key});

  static Future<void> show(BuildContext context, TtsCubit ttsCubit) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          BlocProvider.value(value: ttsCubit, child: const TtsControlSheet()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: BlocBuilder<TtsCubit, TtsState>(
        builder: (context, state) {
          final cubit = context.read<TtsCubit>();
          final currentSentence = state.currentSentence;

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag Handle
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 12),

              // Header
              Row(
                children: [
                  const Icon(Icons.record_voice_over_rounded),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Text-to-Speech Narration',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        if (state.chapterTitle.isNotEmpty)
                          Text(
                            state.chapterTitle,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: colorScheme.onSurfaceVariant),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Active sentence card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: state.isPlaying
                        ? colorScheme.primary
                        : colorScheme.outlineVariant,
                    width: state.isPlaying ? 1.5 : 1.0,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          state.sentences.isNotEmpty
                              ? 'Sentence ${state.currentSentenceIndex + 1} of ${state.sentences.length}'
                              : 'No content',
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        if (state.isPlaying)
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: colorScheme.primary,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Speaking',
                                style: Theme.of(context).textTheme.labelSmall
                                    ?.copyWith(
                                      color: colorScheme.primary,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      currentSentence?.text ??
                          'Select a chapter to begin narration.',
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(height: 1.4),
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Playback controls
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    iconSize: 32,
                    icon: const Icon(Icons.skip_previous_rounded),
                    tooltip: 'Previous Sentence',
                    onPressed: state.currentSentenceIndex > 0
                        ? () => cubit.previousSentence()
                        : null,
                  ),
                  const SizedBox(width: 16),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      shape: const CircleBorder(),
                      padding: const EdgeInsets.all(16),
                    ),
                    onPressed: state.sentences.isEmpty
                        ? null
                        : () {
                            if (state.isPlaying) {
                              cubit.pause();
                            } else if (state.isPaused) {
                              cubit.resume();
                            } else {
                              cubit.play();
                            }
                          },
                    child: Icon(
                      state.isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                      size: 36,
                    ),
                  ),
                  const SizedBox(width: 16),
                  IconButton(
                    iconSize: 32,
                    icon: const Icon(Icons.skip_next_rounded),
                    tooltip: 'Next Sentence',
                    onPressed:
                        state.currentSentenceIndex + 1 < state.sentences.length
                        ? () => cubit.nextSentence()
                        : null,
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    iconSize: 28,
                    icon: const Icon(Icons.stop_rounded),
                    tooltip: 'Stop',
                    onPressed: !state.isStopped ? () => cubit.stop() : null,
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Speech Speed selector
              Row(
                children: [
                  const Icon(Icons.speed_rounded, size: 20),
                  const SizedBox(width: 8),
                  Text('Speed: ${state.rate.toStringAsFixed(2)}x'),
                  Expanded(
                    child: Slider(
                      value: state.rate,
                      min: 0.5,
                      max: 2.0,
                      divisions: 6,
                      onChanged: (val) => cubit.setRate(val),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
