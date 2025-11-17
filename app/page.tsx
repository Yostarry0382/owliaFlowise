'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Tabs, Tab, Typography, Paper, Button } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import FolderIcon from '@mui/icons-material/Folder';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useRouter } from 'next/navigation';

const FlowBuilder = dynamic(() => import('./components/FlowBuilder'), {
  ssr: false,
});

const SavedOwlsList = dynamic(() => import('./components/SavedOwlsList'), {
  ssr: false,
});

const MultiAgentCanvas = dynamic(() => import('./components/MultiAgentCanvas'), {
  ssr: false,
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Paper sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs
            value={tabValue}
            onChange={handleChange}
            sx={{
              flex: 1,
              '& .MuiTabs-flexContainer': {
                borderBottom: 1,
                borderColor: 'divider',
              },
            }}
          >
            <Tab
              icon={<BuildIcon />}
              label="Flow Builder"
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<FolderIcon />}
              label="Saved Owls"
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<GroupWorkIcon />}
              label="Multi-Agent Canvas"
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
          </Tabs>
          <Button
            variant="contained"
            startIcon={<StorefrontIcon />}
            onClick={() => router.push('/store')}
            sx={{
              mr: 2,
              backgroundColor: '#90CAF9',
              color: '#000',
              '&:hover': {
                backgroundColor: '#64B5F6',
              },
            }}
          >
            Store
          </Button>
        </Box>
      </Paper>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <FlowBuilder />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <SavedOwlsList />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <MultiAgentCanvas />
        </TabPanel>
      </Box>
    </Box>
  );
}