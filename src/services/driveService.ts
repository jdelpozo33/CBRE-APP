import { getAccessToken } from './googleAuth.ts';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
  size?: string;
}

/**
 * Upload deal summary/notes directly to Google Drive as a Markdown or Text document.
 */
export async function uploadDealNoteToDrive(
  filename: string,
  content: string,
  dealName: string
): Promise<{ success: boolean; file?: DriveFileItem; webViewLink?: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace not connected. Please sign in with Google first.');
  }

  const metadata = {
    name: filename.endsWith('.md') ? filename : `${filename}.md`,
    mimeType: 'text/markdown',
    description: `Broker Buddy Deal Intelligence debrief for ${dealName}`,
  };

  const boundary = '-------BrokerBuddyDriveUploadBoundary' + Math.floor(Math.random() * 100000);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
    content +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Drive upload error (${res.status})`);
  }

  const file = await res.json();
  return { success: true, file, webViewLink: file.webViewLink };
}

/**
 * List or search files in Google Drive.
 */
export async function listGoogleDriveFiles(
  searchQuery: string = '',
  pageSize: number = 12
): Promise<DriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) return [];

  let query = "trashed = false";
  if (searchQuery.trim()) {
    query += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&pageSize=${pageSize}&fields=files(id,name,mimeType,webViewLink,webContentLink,modifiedTime,size)&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return data.files || [];
}
