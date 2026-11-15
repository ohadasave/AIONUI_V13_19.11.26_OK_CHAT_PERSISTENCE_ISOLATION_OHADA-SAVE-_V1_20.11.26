/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import MessageList from '@renderer/messages/MessageList';
import { MessageListProvider, useMessageLstCache } from '@renderer/messages/hooks';
import HOC from '@renderer/utils/HOC';
import FlexFullContainer from '@renderer/components/FlexFullContainer';
import N8nMultiWorkflowSendBox from './N8nMultiWorkflowSendBox';

const N8nMultiWorkflowChat: React.FC<{
  conversation_id: string;
}> = ({ conversation_id }) => {
  useMessageLstCache(conversation_id);

  return (
    <div className='flex-1 flex flex-col px-20px'>
      <FlexFullContainer>
        <MessageList className='flex-1'></MessageList>
      </FlexFullContainer>
      <N8nMultiWorkflowSendBox conversation_id={conversation_id} />
    </div>
  );
};

export default HOC(MessageListProvider)(N8nMultiWorkflowChat);
