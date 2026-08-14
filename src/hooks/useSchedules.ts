import { useCallback, useEffect, useMemo, useState } from 'react'
import { scheduleRepository } from '../db/scheduleRepository'
import type { Schedule, ScheduleDraft } from '../types/schedule'

type LoadingState = 'idle' | 'loading' | 'ready' | 'error'

export const useSchedules = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [state, setState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setState('loading')
      await scheduleRepository.initialize()
      setSchedules(await scheduleRepository.list())
      setError(null)
      setState('ready')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '读取档期失败')
      setState('error')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createSchedule = useCallback(
    async (draft: ScheduleDraft) => {
      const schedule = await scheduleRepository.create(draft)
      await refresh()
      return schedule
    },
    [refresh],
  )

  const updateSchedule = useCallback(
    async (id: string, draft: ScheduleDraft) => {
      const schedule = await scheduleRepository.update(id, draft)
      await refresh()
      return schedule
    },
    [refresh],
  )

  const removeSchedule = useCallback(
    async (id: string) => {
      await scheduleRepository.remove(id)
      await refresh()
    },
    [refresh],
  )

  const updateStatus = useCallback(
    async (id: string, status: Schedule['status']) => {
      await scheduleRepository.updateStatus(id, status)
      await refresh()
    },
    [refresh],
  )

  const duplicateSchedule = useCallback(
    async (source: Schedule, date: string) => {
      const schedule = await scheduleRepository.duplicate(source, date)
      await refresh()
      return schedule
    },
    [refresh],
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
