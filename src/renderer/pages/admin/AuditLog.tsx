/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Table, Button, Input, Message, Tag, DatePicker, Space } from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import { useTranslation } from 'react-i18next';
// import Cookies from 'js-cookie';
import { CONFIG } from '@/common/config';

interface IAuditLog {
  id: string;
  user_id: string;
  user_username?: string;
  target_user_id?: string;
  target_username?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: number;
}

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const { RangePicker } = DatePicker;

export function AuditLog() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 50,
    hasMore: false,
  });

  // Filters
  const [userIdFilter, setUserIdFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Date | undefined, Date | undefined]>([undefined, undefined]);

  // Load audit logs
  useEffect(() => {
    loadLogs();
  }, [pagination.page, userIdFilter, actionFilter, dateRange]);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
      });

      if (userIdFilter.trim()) {
        params.append('user_id', userIdFilter.trim());
      }
      if (actionFilter.trim()) {
        params.append('action', actionFilter.trim());
      }
      if (dateRange[0]) {
        params.append('start_date', String(dateRange[0].getTime()));
      }
      if (dateRange[1]) {
        params.append('end_date', String(dateRange[1].getTime()));
      }

      // Get token from cookie
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${CONFIG.SESSION_COOKIE}=`))
        ?.split('=')[1];
      const token = cookieValue;
      const response = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setLogs(result.data.data || []);
        setPagination({
          total: result.data.total || 0,
          page: result.data.page || 1,
          pageSize: result.data.pageSize || 50,
          hasMore: result.data.hasMore || false,
        });
      } else {
        Message.error(result.error || 'Failed to load audit logs');
      }
    } catch (error: any) {
      console.error('[AuditLog] Failed to load logs:', error);
      Message.error(`Failed to load audit logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function formatDetails(details?: string): string {
    if (!details) return '-';
    try {
      const parsed = JSON.parse(details);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return details;
    }
  }

  function getActionColor(action: string): string {
    if (action.includes('block') || action.includes('delete')) return 'red';
    if (action.includes('create') || action.includes('unblock')) return 'green';
    if (action.includes('update') || action.includes('modify')) return 'orange';
    return 'blue';
  }

  const columns: ColumnProps<IAuditLog>[] = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      width: 180,
      render: (timestamp: number) => formatDate(timestamp),
      sorter: (a, b) => a.created_at - b.created_at,
      defaultSortOrder: 'descend',
    },
    {
      title: 'User',
      dataIndex: 'user_username',
      width: 150,
      render: (username?: string, record?: IAuditLog) => (
        <div>
          <div className='font-medium'>{username || 'Unknown'}</div>
          <div className='text-xs text-gray-500'>{record?.user_id?.slice(0, 12)}...</div>
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 180,
      render: (action: string) => <Tag color={getActionColor(action)}>{action}</Tag>,
    },
    {
      title: 'Target',
      dataIndex: 'target_username',
      width: 150,
      render: (username?: string, record?: IAuditLog) => {
        if (!record?.target_user_id) return '-';
        return (
          <div>
            <div className='font-medium'>{username || 'Unknown'}</div>
            <div className='text-xs text-gray-500'>{record.target_user_id.slice(0, 12)}...</div>
          </div>
        );
      },
    },
    {
      title: 'Resource',
      width: 150,
      render: (_: any, record: IAuditLog) => {
        if (!record.resource_type) return '-';
        return (
          <div>
            <div className='text-sm'>{record.resource_type}</div>
            {record.resource_id && <div className='text-xs text-gray-500'>{record.resource_id.slice(0, 12)}...</div>}
          </div>
        );
      },
    },
    {
      title: 'Details',
      dataIndex: 'details',
      width: 200,
      ellipsis: true,
      render: (details?: string) => {
        if (!details) return '-';
        try {
          const parsed = JSON.parse(details);
          return <pre className='text-xs overflow-x-auto'>{JSON.stringify(parsed, null, 2)}</pre>;
        } catch {
          return <span className='text-sm text-gray-600'>{details}</span>;
        }
      },
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      width: 140,
      render: (ip?: string) => ip || '-',
    },
  ];

  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold mb-4'>Audit Log</h1>

        {/* Filters */}
        <div className='flex gap-4 mb-4 flex-wrap'>
          <Input placeholder='Filter by User ID' value={userIdFilter} onChange={setUserIdFilter} onPressEnter={() => setPagination({ ...pagination, page: 1 })} style={{ width: 200 }} allowClear />

          <Input placeholder='Filter by Action' value={actionFilter} onChange={setActionFilter} onPressEnter={() => setPagination({ ...pagination, page: 1 })} style={{ width: 200 }} allowClear />

          <RangePicker
            placeholder={['Start Date', 'End Date']}
            value={dateRange as any}
            onChange={(dates) => {
              setDateRange(dates as any);
              setPagination({ ...pagination, page: 1 });
            }}
            style={{ width: 300 }}
            showTime
          />

          <Button
            onClick={() => {
              setUserIdFilter('');
              setActionFilter('');
              setDateRange([undefined, undefined]);
              setPagination({ ...pagination, page: 1 });
            }}
          >
            Clear Filters
          </Button>

          <Button onClick={loadLogs}>Refresh</Button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={logs}
        loading={loading}
        pagination={{
          total: pagination.total,
          current: pagination.page,
          pageSize: pagination.pageSize,
          showTotal: true,
          onChange: (page) => {
            setPagination({ ...pagination, page });
          },
        }}
        rowKey='id'
        scroll={{ x: 1400 }}
        expandable={{
          expandedRowRender: (record) => (
            <div className='p-4 bg-gray-50'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <strong>Full User ID:</strong> {record.user_id}
                </div>
                {record.target_user_id && (
                  <div>
                    <strong>Full Target ID:</strong> {record.target_user_id}
                  </div>
                )}
                {record.resource_id && (
                  <div>
                    <strong>Full Resource ID:</strong> {record.resource_id}
                  </div>
                )}
                {record.user_agent && (
                  <div>
                    <strong>User Agent:</strong>
                    <pre className='text-xs mt-1 overflow-x-auto'>{record.user_agent}</pre>
                  </div>
                )}
                {record.details && (
                  <div className='col-span-2'>
                    <strong>Full Details:</strong>
                    <pre className='text-xs mt-1 bg-white p-2 rounded border overflow-x-auto'>{formatDetails(record.details)}</pre>
                  </div>
                )}
              </div>
            </div>
          ),
        }}
      />
    </div>
  );
}

export default AuditLog;
