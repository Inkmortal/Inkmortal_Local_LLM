import { SystemStats } from './AdminDashboardData';

// Extended interface for detailed system stats display
export interface SystemStatsData {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    percentage: number;
  };
  storage: {
    total: number;
    used: number;
    percentage: number;
  };
  network: {
    incoming: number;
    outgoing: number;
    connections: number;
  };
  uptime: {
    days: number;
    hours: number;
    minutes: number;
  };
  ollama: {
    status: string;
    model: string;
    version: string;
    requests: number;
    avgResponseTime: number;
  };
}

// Helper function to determine system health
export const determineSystemHealth = (stats: SystemStatsData) => {
  // CPU health
  const cpuHealth = stats.cpu.usage < 70 
    ? 'good' 
    : stats.cpu.usage < 90 
      ? 'warning' 
      : 'critical';
  
  // Memory health
  const memoryHealth = stats.memory.percentage < 70 
    ? 'good' 
    : stats.memory.percentage < 90 
      ? 'warning' 
      : 'critical';
  
  // Storage health
  const storageHealth = stats.storage.percentage < 70 
    ? 'good' 
    : stats.storage.percentage < 90 
      ? 'warning' 
      : 'critical';
  
  // Overall system health (worst of all subsystems)
  const overallHealth = [cpuHealth, memoryHealth, storageHealth].includes('critical') 
    ? 'critical' 
    : [cpuHealth, memoryHealth, storageHealth].includes('warning') 
      ? 'warning' 
      : 'good';
  
  return {
    cpu: cpuHealth,
    memory: memoryHealth,
    storage: storageHealth,
    overall: overallHealth,
    ollama: stats.ollama.status === 'Running' ? 'good' : 'critical'
  };
};

// Convert basic stats to detailed format
export const convertToDetailedStats = (basicStats: SystemStats): SystemStatsData => {
  // Handle case where basicStats might be null or undefined
  if (!basicStats) {
    return createDefaultStats();
  }
  
  // Handle different object structures
  const cpuValue = typeof basicStats.cpu === 'object' ? basicStats.cpu?.usage || 0 : basicStats.cpu || 0;
  const memoryValue = typeof basicStats.memory === 'object' ? basicStats.memory?.percentage || 0 : basicStats.memory || 0;
  const storageValue = typeof basicStats.storage === 'object' ? basicStats.storage?.percentage || 0 : basicStats.storage || 0;
  
  // Parse uptime string if it exists
  let days = 0;
  let hours = 0;
  let minutes = 0;
  if (typeof basicStats.uptime === 'string') {
    try {
      // Split by commas and spaces to handle different uptime formats
      const uptimeParts = basicStats.uptime.split(/[, ]+/);
      
      // Extract numbers safely with regex
      const dayMatch = uptimeParts.find(p => p.includes('day'));
      if (dayMatch) {
        const dayDigits = dayMatch.match(/\d+/);
        if (dayDigits && dayDigits[0]) {
          days = parseInt(dayDigits[0], 10) || 0;
        }
      }
      
      const hourMatch = uptimeParts.find(p => p.includes('hour'));
      if (hourMatch) {
        const hourDigits = hourMatch.match(/\d+/);
        if (hourDigits && hourDigits[0]) {
          hours = parseInt(hourDigits[0], 10) || 0;
        }
      }
      
      const minMatch = uptimeParts.find(p => p.includes('min'));
      if (minMatch) {
        const minDigits = minMatch.match(/\d+/);
        if (minDigits && minDigits[0]) {
          minutes = parseInt(minDigits[0], 10) || 0;
        }
      }
    } catch (error) {
      console.error('Error parsing uptime string:', error);
    }
  }
  
  // Handle potential missing ollama object using optional chaining
  const ollamaStatus = basicStats.ollama?.status || 'Unknown';
  const ollamaModel = basicStats.ollama?.model || 'Unknown';
  const ollamaVersion = basicStats.ollama?.version || 'Unknown';
  
  // Create the detailed stats object
  return {
    cpu: {
      usage: cpuValue,
      cores: basicStats.cpu?.cores || 0,
      model: basicStats.cpu?.model || 'Unknown CPU'
    },
    memory: {
      total: basicStats.memory?.total || 0,
      used: basicStats.memory?.used || 0,
      percentage: memoryValue
    },
    storage: {
      total: basicStats.storage?.total || 0,
      used: basicStats.storage?.used || 0,
      percentage: storageValue
    },
    network: {
      incoming: basicStats.network?.incoming || 0,
      outgoing: basicStats.network?.outgoing || 0,
      connections: basicStats.network?.connections || 0
    },
    uptime: {
      days,
      hours,
      minutes
    },
    ollama: {
      status: ollamaStatus,
      model: ollamaModel,
      version: ollamaVersion,
      requests: basicStats.ollama?.requests || 0,
      avgResponseTime: basicStats.ollama?.avg_response_time || 0
    }
  };
};

// Create default stats object for error states or initialization
export const createDefaultStats = (): SystemStatsData => {
  return {
    cpu: {
      usage: 0,
      cores: 0,
      model: 'Unknown CPU'
    },
    memory: {
      total: 0,
      used: 0,
      percentage: 0
    },
    storage: {
      total: 0,
      used: 0,
      percentage: 0
    },
    network: {
      incoming: 0,
      outgoing: 0,
      connections: 0
    },
    uptime: {
      days: 0,
      hours: 0,
      minutes: 0
    },
    ollama: {
      status: 'Unknown',
      model: 'Unknown',
      version: 'Unknown',
      requests: 0,
      avgResponseTime: 0
    }
  };
};

// Format sizes in GB
export const formatGB = (sizeInGB: number) => {
  if (sizeInGB < 0.1) {
    return `${Math.round(sizeInGB * 1024)} MB`;
  }
  return `${sizeInGB.toFixed(1)} GB`;
};

// Get uptime string
export const formatUptime = (uptime: { days: number, hours: number, minutes: number }) => {
  const parts = [];
  if (uptime.days > 0) parts.push(`${uptime.days} day${uptime.days !== 1 ? 's' : ''}`);
  if (uptime.hours > 0) parts.push(`${uptime.hours} hour${uptime.hours !== 1 ? 's' : ''}`);
  if (uptime.minutes > 0) parts.push(`${uptime.minutes} minute${uptime.minutes !== 1 ? 's' : ''}`);
  return parts.join(', ') || 'Just started';
};