"use client"

import { useState, useEffect } from 'react'
import { apiService, Team, Agent, CreateTeamData, UpdateTeamData, CreateAgentData, UpdateAgentData } from '@/lib/api'

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const response = await apiService.getTeams()
      if (response.success) {
        setTeams(response.data)
      } else {
        setError('Failed to fetch teams')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams')
    } finally {
      setLoading(false)
    }
  }

  const createTeam = async (data: CreateTeamData): Promise<Team | null> => {
    try {
      const response = await apiService.createTeam(data)
      if (response.success) {
        setTeams(prev => [...prev, response.data])
        return response.data
      } else {
        setError('Failed to create team')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
      return null
    }
  }

  const updateTeam = async (teamId: string, data: UpdateTeamData): Promise<Team | null> => {
    try {
      const response = await apiService.updateTeam(teamId, data)
      if (response.success) {
        setTeams(prev => prev.map(team => 
          team.id === teamId ? response.data : team
        ))
        return response.data
      } else {
        setError('Failed to update team')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team')
      return null
    }
  }

  const deleteTeam = async (teamId: string): Promise<boolean> => {
    try {
      const response = await apiService.deleteTeam(teamId)
      if (response.success) {
        setTeams(prev => prev.filter(team => team.id !== teamId))
        return true
      } else {
        setError('Failed to delete team')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team')
      return false
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  return {
    teams,
    loading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    refetch: fetchTeams
  }
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAgents()
      if (response.success) {
        setAgents(response.data)
      } else {
        setError('Failed to fetch agents')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents')
    } finally {
      setLoading(false)
    }
  }

  const createAgent = async (data: CreateAgentData): Promise<Agent | null> => {
    try {
      const response = await apiService.createAgent(data)
      if (response.success) {
        setAgents(prev => [...prev, response.data])
        return response.data
      } else {
        setError('Failed to create agent')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
      return null
    }
  }

  const inviteAgent = async (data: CreateAgentData): Promise<{ agent: Agent; inviteLink?: string } | null> => {
    try {
      const response = await apiService.inviteAgent(data)
      if (response.success) {
        setAgents(prev => [...prev, response.data])
        return { agent: response.data, inviteLink: response.inviteLink }
      } else {
        setError('Failed to invite agent')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite agent')
      return null
    }
  }

  const updateAgent = async (agentId: string, data: UpdateAgentData): Promise<Agent | null> => {
    try {
      const response = await apiService.updateAgent(agentId, data)
      if (response.success) {
        setAgents(prev => prev.map(agent => 
          agent.id === agentId ? response.data : agent
        ))
        return response.data
      } else {
        setError('Failed to update agent')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent')
      return null
    }
  }

  const deleteAgent = async (agentId: string): Promise<boolean> => {
    try {
      const response = await apiService.deleteAgent(agentId)
      if (response.success) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId))
        return true
      } else {
        setError('Failed to delete agent')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent')
      return false
    }
  }

  const activateAgent = async (agentId: string): Promise<boolean> => {
    try {
      const response = await apiService.activateAgent(agentId)
      if (response.success) {
        setAgents(prev => prev.map(agent => 
          agent.id === agentId ? response.data : agent
        ))
        return true
      } else {
        setError('Failed to activate agent')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate agent')
      return false
    }
  }

  const deactivateAgent = async (agentId: string): Promise<boolean> => {
    try {
      const response = await apiService.deactivateAgent(agentId)
      if (response.success) {
        setAgents(prev => prev.map(agent => 
          agent.id === agentId ? response.data : agent
        ))
        return true
      } else {
        setError('Failed to deactivate agent')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate agent')
      return false
    }
  }

  const resendInvite = async (agentId: string): Promise<string | null> => {
    try {
      const response = await apiService.resendInvite(agentId)
      if (response.success) {
        return response.inviteLink || null
      } else {
        setError('Failed to resend invite')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invite')
      return null
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  return {
    agents,
    loading,
    error,
    createAgent,
    inviteAgent,
    updateAgent,
    deleteAgent,
    activateAgent,
    deactivateAgent,
    resendInvite,
    refetch: fetchAgents
  }
}

export function useDashboardStats() {
  const [stats, setStats] = useState<{
    totalTeams: number;
    totalAgents: number;
    activeAgents: number;
    totalConversations: number;
    activeConversations: number;
    avgResponseTime: number;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await apiService.getDashboardStats()
      if (response.success) {
        setStats(response.data)
      } else {
        setError('Failed to fetch dashboard stats')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}
