# Monitoring Implementation

## Overview
This document outlines the steps to implement system monitoring, logging, and usage tracking for the Seadragon LLM system. This includes monitoring the queue status, system resources, and user activity.

## Steps

1. **Logging Setup:**

   *Task Description:* Set up a comprehensive logging system for the backend application. This will help track errors, requests, and system events.

   ```python
   # backend/app/utils/logging.py
   import logging
   import os
   from datetime import datetime
   from logging.handlers import RotatingFileHandler

   # Create logs directory if it doesn't exist
   os.makedirs("logs", exist_ok=True)

   # Configure logging
   def setup_logging():
       logger = logging.getLogger("seadragon")
       logger.setLevel(logging.INFO)
       
       # Console handler
       console_handler = logging.StreamHandler()
       console_handler.setLevel(logging.INFO)
       console_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
       console_handler.setFormatter(console_format)
       
       # File handler (rotating)
       file_handler = RotatingFileHandler(
           f"logs/seadragon.log",
           maxBytes=10485760,  # 10MB
           backupCount=10
       )
       file_handler.setLevel(logging.INFO)
       file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
       file_handler.setFormatter(file_format)
       
       # Add handlers
       logger.addHandler(console_handler)
       logger.addHandler(file_handler)
       
       return logger

   # Create logger instance
   logger = setup_logging()
   ```

2. **Request Logging Middleware:**

   *Task Description:* Create a middleware to log all incoming requests to the API. This will help track usage patterns and identify potential issues.

   ```python
   # backend/app/middleware/logging.py
   from fastapi import Request
   import time
   from ..utils.logging import logger

   async def log_request_middleware(request: Request, call_next):
       # Get request details
       request_id = request.headers.get("X-Request-ID", "")
       start_time = time.time()
       
       # Log request
       logger.info(f"Request started: {request.method} {request.url.path} (ID: {request_id})")
       
       # Process request
       response = await call_next(request)
       
       # Calculate processing time
       process_time = time.time() - start_time
       
       # Log response
       logger.info(f"Request completed: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.4f}s (ID: {request_id})")
       
       # Add processing time header
       response.headers["X-Process-Time"] = str(process_time)
       
       return response
   ```

3. **Add Middleware to FastAPI App:**

   *Task Description:* Add the request logging middleware to the FastAPI application.

   ```python
   # backend/app/main.py (updated)
   from fastapi import FastAPI, Depends, Request
   from fastapi.middleware.cors import CORSMiddleware
   from .middleware.logging import log_request_middleware
   # ... (existing imports)

   # ... (existing code)

   # Add request logging middleware
   app.middleware("http")(log_request_middleware)
   ```

4. **Usage Tracking Models:**

   *Task Description:* Create database models to track API usage, including request counts, processing times, and error rates.

   ```python
   # backend/app/monitoring/models.py
   from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
   from sqlalchemy.ext.declarative import declarative_base
   from sqlalchemy.sql import func
   from ..auth.models import User, APIKey

   Base = declarative_base()

   class RequestLog(Base):
       __tablename__ = "request_logs"
       id = Column(Integer, primary_key=True)
       path = Column(String)
       method = Column(String)
       status_code = Column(Integer)
       process_time = Column(Float)  # in seconds
       user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
       api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=True)
       client_ip = Column(String)
       timestamp = Column(DateTime, server_default=func.now())

   class SystemMetric(Base):
       __tablename__ = "system_metrics"
       id = Column(Integer, primary_key=True)
       cpu_usage = Column(Float)  # percentage
       memory_usage = Column(Float)  # percentage
       queue_length = Column(Integer)
       active_requests = Column(Integer)
       timestamp = Column(DateTime, server_default=func.now())
   ```

5. **Request Tracking Service:**

   *Task Description:* Create a service to record request details in the database.

   ```python
   # backend/app/monitoring/services.py
   from sqlalchemy.orm import Session
   from fastapi import Request, Response
   from .models import RequestLog
   from ..auth.models import User, APIKey
   from ..utils.logging import logger

   async def record_request(request: Request, response: Response, process_time: float, db: Session):
       """Record request details in the database"""
       try:
           # Get user ID if authenticated
           user_id = None
           if hasattr(request.state, "user") and request.state.user:
               user_id = request.state.user.id
           
           # Get API key ID if present
           api_key_id = None
           api_key = request.headers.get("X-API-Key")
           if api_key:
               api_key_obj = db.query(APIKey).filter(APIKey.key == api_key).first()
               if api_key_obj:
                   api_key_id = api_key_obj.id
           
           # Create request log
           log = RequestLog(
               path=request.url.path,
               method=request.method,
               status_code=response.status_code,
               process_time=process_time,
               user_id=user_id,
               api_key_id=api_key_id,
               client_ip=request.client.host,
           )
           
           db.add(log)
           db.commit()
       except Exception as e:
           logger.error(f"Error recording request: {str(e)}")
   ```

6. **System Metrics Collection:**

   *Task Description:* Create a background task to periodically collect system metrics.

   ```python
   # backend/app/monitoring/metrics.py
   import psutil
   import asyncio
   from sqlalchemy.orm import Session
   from .models import SystemMetric
   from ..queue.manager import queue_manager
   from ..utils.logging import logger

   async def collect_system_metrics(db: Session):
       """Collect system metrics and store in database"""
       try:
           # Get CPU and memory usage
           cpu_usage = psutil.cpu_percent()
           memory_usage = psutil.virtual_memory().percent
           
           # Get queue metrics
           queue_length = len(queue_manager.queue)
           active_requests = 1 if queue_manager.processing else 0
           
           # Create system metric record
           metric = SystemMetric(
               cpu_usage=cpu_usage,
               memory_usage=memory_usage,
               queue_length=queue_length,
               active_requests=active_requests,
           )
           
           db.add(metric)
           db.commit()
           
           logger.debug(f"Recorded system metrics: CPU: {cpu_usage}%, Memory: {memory_usage}%, Queue: {queue_length}")
       except Exception as e:
           logger.error(f"Error collecting system metrics: {str(e)}")

   async def start_metrics_collection(db_func):
       """Start periodic collection of system metrics"""
       while True:
           try:
               db = next(db_func())
               await collect_system_metrics(db)
           except Exception as e:
               logger.error(f"Error in metrics collection: {str(e)}")
           finally:
               if 'db' in locals():
                   db.close()
           
           # Wait for next collection interval (30 seconds)
           await asyncio.sleep(30)
   ```

7. **Start Background Tasks:**

   *Task Description:* Start the background tasks for metrics collection when the application starts.

   ```python
   # backend/app/main.py (updated)
   from fastapi import FastAPI, Depends, Request
   import asyncio
   # ... (existing imports)
   from .monitoring.metrics import start_metrics_collection
   from .db import get_db

   # ... (existing code)

   @app.on_event("startup")
   async def startup_event():
       # Start metrics collection in the background
       asyncio.create_task(start_metrics_collection(get_db))
   ```

8. **Admin API for Monitoring:**

   *Task Description:* Create API endpoints for the admin panel to access monitoring data.

   ```python
   # backend/app/api/admin.py (updated)
   # ... (existing imports)
   from ..monitoring.models import RequestLog, SystemMetric
   from sqlalchemy import func, desc
   from datetime import datetime, timedelta

   # ... (existing code)

   @router.get("/stats/requests")
   async def get_request_stats(
       period: str = "day",
       current_user: User = Depends(get_current_active_user),
       db: Session = Depends(get_db)
   ):
       """Get request statistics for a specific period"""
       # Calculate start time based on period
       now = datetime.now()
       if period == "hour":
           start_time = now - timedelta(hours=1)
       elif period == "day":
           start_time = now - timedelta(days=1)
       elif period == "week":
           start_time = now - timedelta(weeks=1)
       elif period == "month":
           start_time = now - timedelta(days=30)
       else:
           raise HTTPException(status_code=400, detail="Invalid period")
       
       # Get request count
       request_count = db.query(func.count(RequestLog.id)).filter(
           RequestLog.timestamp >= start_time
       ).scalar()
       
       # Get average process time
       avg_process_time = db.query(func.avg(RequestLog.process_time)).filter(
           RequestLog.timestamp >= start_time
       ).scalar() or 0
       
       # Get error count (status code >= 400)
       error_count = db.query(func.count(RequestLog.id)).filter(
           RequestLog.timestamp >= start_time,
           RequestLog.status_code >= 400
       ).scalar()
       
       # Get most used endpoints
       top_endpoints = db.query(
           RequestLog.path,
           func.count(RequestLog.id).label("count")
       ).filter(
           RequestLog.timestamp >= start_time
       ).group_by(
           RequestLog.path
       ).order_by(
           desc("count")
       ).limit(5).all()
       
       return {
           "period": period,
           "request_count": request_count,
           "avg_process_time": avg_process_time,
           "error_count": error_count,
           "error_rate": error_count / request_count if request_count > 0 else 0,
           "top_endpoints": [{"path": path, "count": count} for path, count in top_endpoints],
       }

   @router.get("/stats/system")
   async def get_system_stats(
       period: str = "hour",
       current_user: User = Depends(get_current_active_user),
       db: Session = Depends(get_db)
   ):
       """Get system metrics for a specific period"""
       # Calculate start time based on period
       now = datetime.now()
       if period == "hour":
           start_time = now - timedelta(hours=1)
       elif period == "day":
           start_time = now - timedelta(days=1)
       else:
           raise HTTPException(status_code=400, detail="Invalid period")
       
       # Get system metrics
       metrics = db.query(SystemMetric).filter(
           SystemMetric.timestamp >= start_time
       ).order_by(
           SystemMetric.timestamp
       ).all()
       
       # Calculate averages
       avg_cpu = sum(m.cpu_usage for m in metrics) / len(metrics) if metrics else 0
       avg_memory = sum(m.memory_usage for m in metrics) / len(metrics) if metrics else 0
       avg_queue = sum(m.queue_length for m in metrics) / len(metrics) if metrics else 0
       
       return {
           "period": period,
           "avg_cpu_usage": avg_cpu,
           "avg_memory_usage": avg_memory,
           "avg_queue_length": avg_queue,
           "current_cpu_usage": metrics[-1].cpu_usage if metrics else 0,
           "current_memory_usage": metrics[-1].memory_usage if metrics else 0,
           "current_queue_length": metrics[-1].queue_length if metrics else 0,
           "metrics": [
               {
                   "timestamp": m.timestamp.isoformat(),
                   "cpu_usage": m.cpu_usage,
                   "memory_usage": m.memory_usage,
                   "queue_length": m.queue_length,
                   "active_requests": m.active_requests,
               }
               for m in metrics
           ],
       }
   ```

9. **Admin Panel Monitoring Components:**

   *Task Description:* Create React components for the admin panel to display monitoring data.

   ```typescript
   // frontend/src/pages/components/SystemStats.tsx (updated)
   import React, { useState, useEffect } from 'react';
   import { Line } from 'react-chartjs-2';
   import api from '../../services/api';

   export default function SystemStats() {
     const [period, setPeriod] = useState('hour');
     const [systemStats, setSystemStats] = useState(null);
     const [requestStats, setRequestStats] = useState(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       const fetchStats = async () => {
         setLoading(true);
         try {
           const [systemRes, requestRes] = await Promise.all([
             api.get(`/api/admin/stats/system?period=${period}`),
             api.get(`/api/admin/stats/requests?period=${period}`),
           ]);
           setSystemStats(systemRes.data);
           setRequestStats(requestRes.data);
         } catch (error) {
           console.error('Error fetching stats:', error);
         } finally {
           setLoading(false);
         }
       };

       fetchStats();
     }, [period]);

     if (loading) {
       return <div>Loading stats...</div>;
     }

     return (
       <div className="mb-8">
         <h2 className="text-xl mb-2">System Statistics</h2>
         
         <div className="mb-4">
           <label className="mr-2">Period:</label>
           <select
             value={period}
             onChange={(e) => setPeriod(e.target.value)}
             className="border rounded p-1"
           >
             <option value="hour">Last Hour</option>
             <option value="day">Last Day</option>
             <option value="week">Last Week</option>
             <option value="month">Last Month</option>
           </select>
         </div>
         
         {systemStats && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div className="bg-white p-4 rounded shadow">
               <h3 className="font-bold mb-2">CPU Usage</h3>
               <p className="text-2xl">{systemStats.current_cpu_usage.toFixed(1)}%</p>
               <p className="text-sm text-gray-500">Avg: {systemStats.avg_cpu_usage.toFixed(1)}%</p>
               {/* CPU usage chart would go here */}
             </div>
             
             <div className="bg-white p-4 rounded shadow">
               <h3 className="font-bold mb-2">Memory Usage</h3>
               <p className="text-2xl">{systemStats.current_memory_usage.toFixed(1)}%</p>
               <p className="text-sm text-gray-500">Avg: {systemStats.avg_memory_usage.toFixed(1)}%</p>
               {/* Memory usage chart would go here */}
             </div>
             
             <div className="bg-white p-4 rounded shadow">
               <h3 className="font-bold mb-2">Queue Length</h3>
               <p className="text-2xl">{systemStats.current_queue_length}</p>
               <p className="text-sm text-gray-500">Avg: {systemStats.avg_queue_length.toFixed(1)}</p>
               {/* Queue length chart would go here */}
             </div>
           </div>
         )}
         
         {requestStats && (
           <div className="bg-white p-4 rounded shadow mb-4">
             <h3 className="font-bold mb-2">Request Statistics</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                 <p className="text-sm text-gray-500">Total Requests</p>
                 <p className="text-2xl">{requestStats.request_count}</p>
               </div>
               <div>
                 <p className="text-sm text-gray-500">Avg Response Time</p>
                 <p className="text-2xl">{requestStats.avg_process_time.toFixed(2)}s</p>
               </div>
               <div>
                 <p className="text-sm text-gray-500">Error Rate</p>
                 <p className="text-2xl">{(requestStats.error_rate * 100).toFixed(1)}%</p>
               </div>
             </div>
           </div>
         )}
         
         {requestStats && (
           <div className="bg-white p-4 rounded shadow">
             <h3 className="font-bold mb-2">Top Endpoints</h3>
             <ul>
               {requestStats.top_endpoints.map((endpoint, index) => (
                 <li key={index} className="flex justify-between py-1">
                   <span>{endpoint.path}</span>
                   <span>{endpoint.count} requests</span>
                 </li>
               ))}
             </ul>
           </div>
         )}
       </div>
     );
   }
   ```

10. **Alert System:**

    *Task Description:* Create a simple alert system to notify administrators of potential issues.

    ```python
    # backend/app/monitoring/alerts.py
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import os
    from ..utils.logging import logger

    # Email configuration
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    ALERT_RECIPIENTS = os.getenv("ALERT_RECIPIENTS", "").split(",")

    def send_alert(subject, message):
        """Send an alert email to administrators"""
        if not SMTP_USERNAME or not SMTP_PASSWORD or not ALERT_RECIPIENTS:
            logger.warning("Alert email configuration not complete. Alert not sent.")
            return
        
        try:
            # Create message
            msg = MIMEMultipart()
            msg["From"] = SMTP_USERNAME
            msg["To"] = ", ".join(ALERT_RECIPIENTS)
            msg["Subject"] = f"[ALERT] Seadragon LLM: {subject}"
            
            # Add message body
            msg.attach(MIMEText(message, "plain"))
            
            # Send email
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Alert sent: {subject}")
        except Exception as e:
            logger.error(f"Error sending alert: {str(e)}")

    async def check_system_health(db_func):
        """Check system health and send alerts if necessary"""
        db = next(db_func())
        try:
            # Get latest system metric
            latest_metric = db.query(SystemMetric).order_by(SystemMetric.timestamp.desc()).first()
            
            if latest_metric:
                # Check CPU usage
                if latest_metric.cpu_usage > 90:
                    send_alert(
                        "High CPU Usage",
                        f"CPU usage is at {latest_metric.cpu_usage}%, which is above the 90% threshold."
                    )
                
                # Check memory usage
                if latest_metric.memory_usage > 90:
                    send_alert(
                        "High Memory Usage",
                        f"Memory usage is at {latest_metric.memory_usage}%, which is above the 90% threshold."
                    )
                
                # Check queue length
                if latest_metric.queue_length > 10:
                    send_alert(
                        "Long Queue",
                        f"Queue length is {latest_metric.queue_length}, which is above the threshold of 10."
                    )
        except Exception as e:
            logger.error(f"Error checking system health: {str(e)}")
        finally:
            db.close()
    ```

11. **Add Health Check to Background Tasks:**

    *Task Description:* Add the health check to the background tasks.

    ```python
    # backend/app/main.py (updated)
    # ... (existing imports)
    from .monitoring.alerts import check_system_health

    # ... (existing code)

    @app.on_event("startup")
    async def startup_event():
        # Start metrics collection in the background
        asyncio.create_task(start_metrics_collection(get_db))
        
        # Start health check in the background
        asyncio.create_task(
            # Run health check every 5 minutes
            run_periodic(check_system_health, 300, get_db)
        )

    async def run_periodic(func, interval, *args):
        """Run a function periodically"""
        while True:
            await func(*args)
            await asyncio.sleep(interval)