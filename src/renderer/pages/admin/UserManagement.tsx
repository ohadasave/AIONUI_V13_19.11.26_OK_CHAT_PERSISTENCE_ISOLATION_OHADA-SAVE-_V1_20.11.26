/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Table, Button, Modal, Input, Message, Tag, Space, Select } from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import { CONFIG } from '@/common/config';

interface IUser {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked' | 'suspended';
  created_at: number;
  updated_at: number;
  last_login?: number | null;
  blocked_at?: number | null;
  blocked_by?: string | null;
  blocked_reason?: string | null;
}

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Block modal
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  // Load users
  useEffect(() => {
    loadUsers();
  }, [pagination.page, statusFilter, roleFilter, searchQuery]);

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const token = Cookies.get(CONFIG.SESSION_COOKIE);
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setUsers(result.data.data || []);
        setPagination({
          total: result.data.total || 0,
          page: result.data.page || 1,
          pageSize: result.data.pageSize || 20,
          hasMore: result.data.hasMore || false,
        });
      } else {
        Message.error(result.error || 'Failed to load users');
      }
    } catch (error: any) {
      console.error('[UserManagement] Failed to load users:', error);
      Message.error(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleBlock() {
    if (!selectedUser || !blockReason.trim()) {
      Message.error('Please enter a reason for blocking this user');
      return;
    }

    setBlocking(true);
    try {
      const token = Cookies.get(CONFIG.SESSION_COOKIE);
      const response = await fetch(`/api/admin/users/${selectedUser.id}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: blockReason }),
      });

      const result = await response.json();
      if (result.success) {
        Message.success(`User ${selectedUser.username} blocked successfully`);
        setBlockModalVisible(false);
        setBlockReason('');
        setSelectedUser(null);
        loadUsers(); // Reload list
      } else {
        Message.error(result.error || 'Failed to block user');
      }
    } catch (error: any) {
      console.error('[UserManagement] Failed to block user:', error);
      Message.error(`Failed to block user: ${error.message}`);
    } finally {
      setBlocking(false);
    }
  }

  async function handleUnblock(user: IUser) {
    try {
      const token = Cookies.get(CONFIG.SESSION_COOKIE);
      const response = await fetch(`/api/admin/users/${user.id}/unblock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        Message.success(`User ${user.username} unblocked successfully`);
        loadUsers(); // Reload list
      } else {
        Message.error(result.error || 'Failed to unblock user');
      }
    } catch (error: any) {
      console.error('[UserManagement] Failed to unblock user:', error);
      Message.error(`Failed to unblock user: ${error.message}`);
    }
  }

  function formatDate(timestamp?: number | null): string {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  }

  function openBlockModal(user: IUser) {
    setSelectedUser(user);
    setBlockModalVisible(true);
  }

  function closeBlockModal() {
    setBlockModalVisible(false);
    setBlockReason('');
    setSelectedUser(null);
  }

  const columns: ColumnProps<IUser>[] = [
    {
      title: 'Username',
      dataIndex: 'username',
      width: 200,
      render: (username: string) => <strong>{username}</strong>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: 200,
      render: (email?: string) => email || '-',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>{role.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          blocked: 'red',
          suspended: 'orange',
        };
        return <Tag color={colorMap[status] || 'gray'}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login',
      width: 180,
      render: (timestamp?: number | null) => formatDate(timestamp),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      width: 180,
      render: (timestamp: number) => formatDate(timestamp),
    },
    {
      title: 'Actions',
      width: 200,
      fixed: 'right',
      render: (_: any, user: IUser) => (
        <Space>
          {user.status === 'active' ? (
            <Button
              type="primary"
              status="danger"
              size="small"
              onClick={() => openBlockModal(user)}
            >
              Block
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              onClick={() => handleUnblock(user)}
            >
              Unblock
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <Select
            placeholder="Filter by Status"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPagination({ ...pagination, page: 1 });
            }}
            style={{ width: 200 }}
          >
            <Select.Option value="all">All Status</Select.Option>
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="blocked">Blocked</Select.Option>
            <Select.Option value="suspended">Suspended</Select.Option>
          </Select>

          <Select
            placeholder="Filter by Role"
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              setPagination({ ...pagination, page: 1 });
            }}
            style={{ width: 200 }}
          >
            <Select.Option value="all">All Roles</Select.Option>
            <Select.Option value="admin">Admin</Select.Option>
            <Select.Option value="user">User</Select.Option>
          </Select>

          <Input.Search
            placeholder="Search by username or email"
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={() => setPagination({ ...pagination, page: 1 })}
            style={{ width: 300 }}
          />

          <Button onClick={loadUsers}>Refresh</Button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={users}
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
        rowKey="id"
        scroll={{ x: 1200 }}
      />

      {/* Block Modal */}
      <Modal
        title={`Block User: ${selectedUser?.username}`}
        visible={blockModalVisible}
        onCancel={closeBlockModal}
        onOk={handleBlock}
        confirmLoading={blocking}
        okButtonProps={{ status: 'danger' }}
        okText="Block User"
      >
        <div className="mb-4">
          <p className="mb-2">
            Are you sure you want to block <strong>{selectedUser?.username}</strong>?
          </p>
          <p className="text-gray-600 text-sm mb-4">
            This user will be immediately logged out and unable to access the system.
          </p>
        </div>

        <div>
          <label className="block mb-2 font-medium">
            Reason for blocking <span className="text-red-500">*</span>
          </label>
          <Input.TextArea
            placeholder="Enter the reason for blocking this user (required)"
            value={blockReason}
            onChange={setBlockReason}
            rows={4}
            maxLength={500}
            showWordLimit
          />
        </div>

        {selectedUser?.role === 'admin' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-700 text-sm">
              ⚠️ <strong>Warning:</strong> You are about to block an admin user. Make sure there
              are other admin accounts with access to the system.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default UserManagement;
