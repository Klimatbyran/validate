import React from 'react';
import { motion } from 'framer-motion';
import mermaid from 'mermaid';
import { useQueuesStats } from '@/hooks/useQueuesStats';

// Initialize mermaid with dark theme configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#F48F2A',
    primaryTextColor: '#F7F7F7',
    primaryBorderColor: '#2E2E2E',
    lineColor: '#878787',
    secondaryColor: '#59A0E1',
    tertiaryColor: '#AAE506',
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
  securityLevel: 'loose',
});

export function WorkflowDiagram() {
  const { queuesStats } = useQueuesStats();
  const [svg, setSvg] = React.useState<string>('');

  // Create the diagram with job counts
  const diagram = React.useMemo(() => {
    const getQueueStats = (queueId: string) => {
      const stats = queuesStats?.find(q => q.name === queueId)?.status ?? { active: 0, waiting: 0 };
      const total = (stats.active ?? 0) + (stats.waiting ?? 0); 
      return total > 0 ? `<br/>(${total})` : '';
    };

    return `
      flowchart TB
        %% Define subgraphs with styling
        subgraph Input["Input"]
          style Input fill:none,stroke:#2E2E2E,color:#878787
          PDF[PDF]
          Cache[Cache${getQueueStats('cache')}]
          NLM[Parse PDF${getQueueStats('nlmParsePDF')}]
          Tables[Tables${getQueueStats('nlmExtractTables')}]
        end

        subgraph Processing["Processing"]
          style Processing fill:none,stroke:#2E2E2E,color:#878787
          Precheck[Precheck${getQueueStats('precheck')}]
          GuessWikidata[Wikidata${getQueueStats('guessWikidata')}]
          FiscalYear[Fiscal Year${getQueueStats('diffReportingPeriods')}]
          Emissions[Emissions${getQueueStats('extractEmissions')}]
        end

        subgraph Analysis["Analysis"]
          style Analysis fill:none,stroke:#2E2E2E,color:#878787
          Industry[Industry${getQueueStats('diffIndustry')}]
          Scope1[Scope 1+2${getQueueStats('diffScope12')}]
          Scope3[Scope 3${getQueueStats('diffScope3')}]
          Biogenic[Biogenic${getQueueStats('diffBiogenic')}]
          Goals[Goals${getQueueStats('diffGoals')}]
          Initiatives[Initiatives${getQueueStats('diffInitiatives')}]
          Turnover[Turnover${getQueueStats('diffTurnover')}]
          Employees[Employees${getQueueStats('diffEmployees')}]
          BaseYear[Base Year${getQueueStats('diffBaseYear')}]
        end

        subgraph Output["Output"]
          style Output fill:none,stroke:#2E2E2E,color:#878787
          Tags[Tags${getQueueStats('diffTags')}]
          Wikipedia[Wikipedia${getQueueStats('wikipediaUpload')}]
          Markdown[Markdown${getQueueStats('indexMarkdown')}]
          CheckDB[DB Check${getQueueStats('checkDB')}]
          Review[Review${getQueueStats('sendCompanyLink')}]
          API((API))
        end

        %% Flow
        PDF --> Cache
        Cache --> NLM
        NLM --> Tables
        Tables --> Precheck
        Cache --> Precheck

        %% Processing flow
        Precheck --> GuessWikidata
        Precheck --> FiscalYear
        GuessWikidata --> Emissions
        FiscalYear --> Emissions

        %% Analysis flow
        Emissions --> Industry
        Emissions --> Scope1
        Emissions --> Scope3
        Emissions --> Biogenic
        Emissions --> Goals
        Emissions --> Initiatives
        Emissions --> Turnover
        Emissions --> Employees
        Emissions --> BaseYear

        %% Output flow
        Industry --> Tags
        Scope1 --> Tags
        Scope3 --> Tags
        Biogenic --> Tags
        Goals --> Tags
        Initiatives --> Tags
        Turnover --> Tags
        Employees --> Tags
        BaseYear --> Tags

        Industry --> Wikipedia
        Scope1 --> Wikipedia
        Scope3 --> Wikipedia
        Biogenic --> Wikipedia
        Goals --> Wikipedia
        Initiatives --> Wikipedia
        Turnover --> Wikipedia
        Employees --> Wikipedia
        BaseYear --> Wikipedia

        Industry --> Markdown
        Scope1 --> Markdown
        Scope3 --> Markdown
        Biogenic --> Markdown
        Goals --> Markdown
        Initiatives --> Markdown
        Turnover --> Markdown
        Employees --> Markdown
        BaseYear --> Markdown

        Tags --> CheckDB
        Wikipedia --> CheckDB
        Markdown --> CheckDB
        CheckDB --> Review
        Review --> API

        %% Node styling
        classDef default fill:#2E2E2E,stroke:#878787,color:#F7F7F7
        classDef active fill:#59A0E1,stroke:#206288,color:#F7F7F7
        classDef waiting fill:#F48F2A,stroke:#B25F00,color:#F7F7F7
        classDef completed fill:#AAE506,stroke:#6C9105,color:#F7F7F7
        classDef failed fill:#F0759A,stroke:#97455D,color:#F7F7F7

        %% Apply styles based on queue status
        ${(queuesStats || []).map(({name, status}) => {
          if (status?.active && status?.active > 0) return `class ${name} active`;
          if (status?.waiting && status.waiting > 0) return `class ${name} waiting`;
          if (status?.failed && status.failed > 0) return `class ${name} failed`;
          if (status?.completed && status.completed > 0) return `class ${name} completed`;
          return '';
        }).filter(Boolean).join('\n')}
    `;
  }, [queuesStats]);

  React.useEffect(() => {
    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render('workflow-diagram', diagram);
        setSvg(svg);
      } catch (error) {
        console.error('Failed to render diagram:', error);
      }
    };

    renderDiagram();
  }, [diagram]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
    >
      <h2 className="text-xl font-semibold text-gray-01 mb-6">
        Processflöde
      </h2>
      <div 
        className="text-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </motion.div>
  );
}