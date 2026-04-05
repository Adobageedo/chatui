declare global {
  interface Window {
    chrome?: {
      runtime?: {
        id?: string;
        lastError?: { message: string };
      };
      tabs?: {
        query: (queryInfo: any, callback: (tabs: any[]) => void) => void;
        sendMessage: (tabId: number, message: any, callback: (response: any) => void) => void;
      };
    };
    __reasoningEnabled__?: boolean;
    __emailContext__?: any;
  }

  namespace Office {
    enum HostType {
      Outlook = "Outlook"
    }

    enum AsyncResultStatus {
      Succeeded = "succeeded",
      Failed = "failed"
    }

    enum CoercionType {
      Text = "text",
      Html = "html"
    }

    interface Context {
      mailbox: {
        item?: any;
        displayNewMessageForm: (params: any) => void;
      };
    }

    const context: Context;

    function onReady(callback: (info: { host: HostType }) => void): void;
  }

  const Office: typeof Office;
  
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      [key: string]: string | undefined;
    }
  }

  const process: {
    env: NodeJS.ProcessEnv;
  };
}

export {};
