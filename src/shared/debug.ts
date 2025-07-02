let debugEnabled = false;

export function setDebugMode(enabled: boolean): void {
  debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function debugLog(message: string, data?: unknown): void {
  if (!debugEnabled) return;

  console.log(`\n🐛 [DEBUG] ${message}`);
  if (data !== undefined) {
    console.log(data);
  }
}

export function debugLogRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown
): void {
  if (!debugEnabled) return;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🐛 [DEBUG] API REQUEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Method: ${method}`);
  console.log(`🌐 URL: ${url}`);

  // Hide API key in headers
  const sanitizedHeaders = { ...headers };
  if (sanitizedHeaders['x-api-key']) {
    sanitizedHeaders['x-api-key'] = 'YOUR-API-KEY';
  }
  console.log('📄 Headers:');
  for (const [key, value] of Object.entries(sanitizedHeaders)) {
    console.log(`   ${key}: ${value}`);
  }

  if (body) {
    if (Buffer.isBuffer(body)) {
      console.log('📦 Body: [BINARY DATA]');
    } else if (
      body &&
      typeof body === 'object' &&
      'toString' in body &&
      typeof body.toString === 'function'
    ) {
      // Handle FormData - show the fields
      console.log('📦 Body: [FORM DATA]');
      if ('getHeaders' in body && typeof body.getHeaders === 'function') {
        try {
          const formHeaders = body.getHeaders();
          console.log(`   Content-Type: ${formHeaders['content-type']}`);
        } catch {
          // Ignore errors getting form headers
        }
      }

      // Try to inspect FormData fields
      if ('_streams' in body && Array.isArray(body._streams)) {
        const fields: string[] = [];
        for (let i = 0; i < body._streams.length; i++) {
          const stream = body._streams[i];
          if (
            typeof stream === 'string' &&
            stream.includes('Content-Disposition: form-data; name=')
          ) {
            const match = stream.match(/name="([^"]+)"/);
            if (match?.[1]) {
              const fieldName = match[1];
              if (fieldName === 'imageFile' || fieldName === 'image_file') {
                fields.push(`${fieldName}: [IMAGE FILE]`);
              } else {
                fields.push(fieldName);
              }
            }
          }
        }
        if (fields.length > 0) {
          console.log(`   Fields: ${fields.join(', ')}`);
        }
      }
    } else {
      console.log('📦 Body:', body);
    }
  }
}

export function debugLogResponse(
  statusCode: number,
  headers: Record<string, unknown>,
  body: Buffer | unknown
): void {
  if (!debugEnabled) return;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🐛 [DEBUG] API RESPONSE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Status: ${statusCode}`);
  console.log('📄 Headers:');
  for (const [key, value] of Object.entries(headers)) {
    console.log(`   ${key}: ${value}`);
  }

  if (Buffer.isBuffer(body)) {
    // Check if it's an image by looking at the first few bytes or content type
    const isImage =
      body.length > 0 &&
      (body
        .subarray(0, 4)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) || // PNG
        body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) || // JPEG
        body.subarray(0, 6).equals(Buffer.from('GIF87a')) || // GIF87a
        body.subarray(0, 6).equals(Buffer.from('GIF89a')) || // GIF89a
        body.subarray(0, 4).equals(Buffer.from('RIFF'))); // WebP (starts with RIFF)

    if (isImage) {
      console.log('📦 Body: [IMAGE]');
    } else {
      // Try to parse as text/JSON
      try {
        const text = body.toString('utf8');
        console.log('📦 Body:');

        // Try to pretty-print JSON
        try {
          const parsed = JSON.parse(text);
          console.log(
            JSON.stringify(parsed, null, 2)
              .split('\n')
              .map((line) => `   ${line}`)
              .join('\n')
          );
        } catch {
          // Not JSON, just print as text
          console.log(`   ${text}`);
        }
      } catch {
        console.log('📦 Body: [BINARY DATA]');
      }
    }
  } else {
    console.log('📦 Body:');
    if (typeof body === 'object') {
      console.log(
        JSON.stringify(body, null, 2)
          .split('\n')
          .map((line) => `   ${line}`)
          .join('\n')
      );
    } else {
      console.log(`   ${body}`);
    }
  }
}
