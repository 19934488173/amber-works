import { useCallback, useEffect, useMemo, useState } from 'react'
import { createScheduleRepository } from '../db/scheduleRepository'
import type { Schedule, ScheduleDraft } from '../types/schedule'

type LoadingState = 'idle' | 'loading' | 'ready' | 'error'

export const useSchedules = (knownUserId?: string | null) => {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [state, setState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const scheduleRepository = useMemo(() => createScheduleRepository(knownUserId), [knownUserId])

  const refresh = useCallback(async () => {
    try {
      setState('loading')
      const [, nextSchedules] = await Promise.all([
        scheduleRepository.initialize(),
        scheduleRepository.list(),
      ])
      setSchedules(nextSchedules)
      setError(null)
      setState('ready')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '读取档期失败')
      setState('error')
    }
  }, [scheduleRepository])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createSchedule = useCallback(
    async (draft: ScheduleDraft) => {
      const schedule = await scheduleRepository.create(draft)
      await refresh()
      return schedule
    },
    [refresh, scheduleRepository],
  )

  const updateSchedule = useCallback(
    async (id: string, draft: ScheduleDraft) => {
      const schedule = await scheduleRepository.update(id, draft)
      await refresh()
      return schedule
    },
    [refresh, scheduleRepository],
  )

  const removeSchedule = useCallback(
    async (id: string) => {
      await scheduleRepository.remove(id)
      await refresh()
    },
    [refresh, scheduleRepository],
  )

  const updateStatus = useCallback(
    async (id: string, status: Schedule['status']) => {
      await scheduleRepository.updateStatus(id, status)
      await refresh()
    },
    [refresh, scheduleRepository],
  )

  const duplicateSchedule = useCallback(
    async (source: Schedule, date: string) => {
      const schedule = await scheduleRepository.duplicate(source, date)
      await refresh()
      return schedule
    },
    [refresh, scheduleRepository],
  )

  return useMemo(
    () => ({
      schedules,
      state,
      error,
      refresh,
      createSchedule,
      updateSchedule,
      removeSchedule,
      updateStatus,
      duplicateSchedule,
    }),
    [
      schedules,
      state,
      error,
      refresh,
      createSchedule,
      updateSchedule,
      removeSchedule,
      updateStatus,
      duplicateSchedule,
    ],
  )
}
