import { logger, Function, Response } from '@zaiusinc/app-sdk';
// import { AuthSection } from '../data/data';
// import { parseExcelFromCmp } from 'OpalToolExcelParse.ts';
import xlsx from 'xlsx';
import axios from 'axios';
import { createMilestoneWithinCampaign, updateMilestoneWithinCampaign, getCampaignTree, getAllTasksForCampaign, getMilestonesWithinCampaign, getAssetFromCMP } from '../cmp';


interface OptiAuthData {
  provider: string;
  credentials: {
    token_type: string;
    access_token: string;
    org_sso_id: string;
    user_id: string;
    instance_id: string;
    customer_id: string;
    product_sku: string;
  };
}

interface NormalizedEvent {
  month: string;
  lob: string;
  category: 'in-person' | 'online';
  title: string;
  date: string;
  stakeholder: string;
  city: string;
  isMultiLob: boolean;
}

type GroupedEvents = Record<
  string,
  Record<string, { 'in-person': NormalizedEvent[]; online: NormalizedEvent[] }>
>;

interface SlideEvent {
  title: string;
  date: string;
  stakeholder: string;
  city: string;
  isMultiLob: boolean;
}

interface Slide {
  month: string;
  lob: string;
  legend: string;
  inPerson: SlideEvent[];
  online: SlideEvent[];
}

interface CsvMergeLookupParams {
  excel_file1_id: string;
  excel_file2_id: string;
  file1_match_column: string;
  file2_match_column: string;
  append_columns: string[];
}

interface ExcelLookupParams {
  excel_file1_id: string;
  excel_file2_id: string;
  file1_match_column: string;
  file2_match_column: string;
  append_columns: string[];
}

function toIsoUtc(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  return date.toISOString(); // Always outputs: 2025-11-24T13:15:30.000Z
}

function safeCellValue(value: unknown): string { // updated to normalize case - march 23 2026
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    return value.trim().toLowerCase(); // normalize case
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // Handle unexpected types (e.g., objects, dates)
  try {
    return String(value).trim().toLowerCase();
  } catch {
    return '';
  }
}


// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
  'functions': [
    {
      'name': 'create_milestone_within_campaign',
      'description': 'Create a milestone inside a CMP campaign',
      'parameters': [
        {
          'name': 'campaign_id',
          'type': 'string',
          'description': 'The CMP campaign ID',
          'required': true
        },
        {
          'name': 'title',
          'type': 'string',
          'description': 'Title of the milestone',
          'required': true
        },
        {
          'name': 'description',
          'type': 'string',
          'description': 'Description of the milestone (optional)',
          'required': false
        },
        {
          'name': 'due_date',
          'type': 'string',
          'description': 'Due date in ISO 8601 UTC format e.g. 2025-11-24T13:15:30Z',
          'required': true
        },
        {
          'name': 'hex_color',
          'type': 'string',
          'description': 'Hex color code for the milestone label',
          'required': false
        },
        {
          'name': 'tasks',
          'type': 'array',
          'description': 'List of task objects with format [{ id: string }]',
          'required': false
        }
      ],
      'endpoint': '/tools/create-milestone-within-campaign',
      'http_method': 'POST',
      'auth_requirements': [
        {
          'provider': 'OptiID',
          'scope_bundle': 'default',
          'required': true
        }
      ]
    },
    {
      'name': 'update_milestone_within_campaign',
      'description': 'Update a milestone inside a CMP campaign',
      'parameters': [
        {
          'name': 'id',
          'type': 'string',
          'description': 'The milestone ID to update',
          'required': true
        },
        {
          'name': 'title',
          'type': 'string',
          'description': 'Updated title (1–80 chars)',
          'required': false
        },
        {
          'name': 'description',
          'type': 'string',
          'description': 'Updated description (1–250 chars)',
          'required': false
        },
        {
          'name': 'campaign_id',
          'type': 'string',
          'description': 'Campaign ID to associate with this milestone',
          'required': true
        },
        {
          'name': 'due_date',
          'type': 'string',
          'description': 'Updated ISO 8601 UTC due date',
          'required': false
        },
        {
          'name': 'hex_color',
          'type': 'string',
          'description': 'Updated hex color code',
          'required': false
        },
        {
          'name': 'tasks',
          'type': 'array',
          'description': 'List of task objects [{ id: string }]',
          'required': true
        }
      ],
      'endpoint': '/tools/update-milestone-within-campaign',
      'http_method': 'PATCH',
      'auth_requirements': [
        {
          'provider': 'OptiID',
          'scope_bundle': 'default',
          'required': true
        }
      ]
    },
    {
      name: 'get_child_campaigns',
      description: 'Fetch a campaign and recursively retrieve all child/sub-campaigns',
      parameters: [
        {
          name: 'campaign_id',
          type: 'string',
          description: 'Root CMP campaign ID',
          required: true
        }
      ],
      endpoint: '/tools/get-child-campaigns',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    },
    {
      name: 'get_campaign_tasks',
      description: 'Fetch all tasks under a CMP campaign (paginated)',
      parameters: [
        {
          name: 'campaign_id',
          type: 'string',
          description: 'CMP campaign ID',
          required: true
        }
      ],
      endpoint: '/tools/get-campaign-tasks',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    },
    {
      name: 'get_milestones_within_campaign',
      description: 'Fetch all milestones within a CMP campaign',
      parameters: [
        {
          name: 'campaign_id',
          type: 'string',
          description: 'CMP campaign ID',
          required: true
        }
      ],
      endpoint: '/tools/get-milestones-within-campaign',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    },
    {
      name: 'generate_event_deck_from_excel',
      description: 'Generate Q1 event slides JSON from CMP Excel asset',
      parameters: [
        {
          name: 'asset_id',
          type: 'string',
          description: 'CMP Excel asset ID',
          required: true
        }
      ],
      endpoint: '/tools/generate-event-deck-from-excel',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    },
    {
      name: 'excel_lookup_merge',
      description: 'Lookup values from Excel File1 into Excel File2 and append selected columns',
      parameters: [
        {
          name: 'excel_file1_id',
          type: 'string',
          description: 'Opal file ID of Excel File1 (lookup source)',
          required: true
        },
        {
          name: 'excel_file2_id',
          type: 'string',
          description: 'Opal file ID of Excel File2 (target file)',
          required: true
        },
        {
          name: 'file1_match_column',
          type: 'string',
          description: 'Column name in Excel File1 used for lookup',
          required: true
        },
        {
          name: 'file2_match_column',
          type: 'string',
          description: 'Column name in Excel File2 used for lookup',
          required: true
        },
        {
          name: 'append_columns',
          type: 'array',
          description: 'Columns from Excel File1 to append into Excel File2',
          required: true
        }
      ],
      endpoint: '/tools/excel-lookup-merge',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    },
    {
      name: 'csv_merge_lookup',
      description: `Merge two CSV files by performing a lookup between matching columns and 
      appending selected columns from File1 to File2.`,
      parameters: [
        {
          name: 'excel_file1_id',
          type: 'string',
          description: 'File ID of the source CSV file',
          required: true
        },
        {
          name: 'excel_file2_id',
          type: 'string',
          description: 'File ID of the target CSV file',
          required: true
        },
        {
          name: 'file1_match_column',
          type: 'string',
          description: 'Column name in File1 used for matching',
          required: true
        },
        {
          name: 'file2_match_column',
          type: 'string',
          description: 'Column name in File2 used for matching',
          required: true
        },
        {
          name: 'append_columns',
          type: 'array',
          description: 'Columns from File1 that should be appended to File2',
          required: true
        }
      ],
      endpoint: '/tools/csv-merge-lookup',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    },
    {
      name: 'excel_lookup_to_csv_file',
      description: `Perform a lookup merge between two Excel files and return a 
      CSV file payload ready for write_content_to_file.`,
      parameters: [
        {
          name: 'excel_file1_id',
          type: 'string',
          description: 'File ID of the source Excel file',
          required: true
        },
        {
          name: 'excel_file2_id',
          type: 'string',
          description: 'File ID of the target Excel file',
          required: true
        },
        {
          name: 'file1_match_column',
          type: 'string',
          description: 'Column in File1 used for matching',
          required: true
        },
        {
          name: 'file2_match_column',
          type: 'string',
          description: 'Column in File2 used for matching',
          required: true
        },
        {
          name: 'append_columns',
          type: 'array',
          description: 'Columns from File1 to append to File2',
          required: true
        }
      ],
      endpoint: '/tools/excel-lookup-to-csv-file',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    },
    {
      name: 'excel_sumif_to_csv_file',
      description: `Perform a SUMIF-style grouped aggregation on a single Excel file.
      Groups rows by a specified column and appends a new column with the total sum 
      of another column for each group.`,
      parameters: [
        {
          name: 'excel_file_id',
          type: 'string',
          description: 'File ID of the Excel file (File3)',
          required: true
        },
        {
          name: 'group_column',
          type: 'string',
          description: 'Column used to group rows (e.g., Name or ID)',
          required: true
        },
        {
          name: 'sum_column',
          type: 'string',
          description: 'Column containing numeric values to sum (e.g., Amount / Pay rate)',
          required: true
        },
        {
          name: 'output_column_name',
          type: 'string',
          description: 'Name of the new column to store the aggregated sum (e.g., Total)',
          required: true
        }
      ],
      endpoint: '/tools/excel-sumif-to-csv-file',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    }
  ]
};

/**
 * class that implements the Opal tool functions. Requirements:
 * - Must extend the Function class from the SDK
 * - Name must match the value of entry_point property from app.yml manifest
 * - Name must match the file name
 */
export class OpalToolFunction extends Function {

  /**
   * Processing the request from Opal
   * Add your logic here to handle every tool declared in the discoveryPayload.
   */
  public async perform(): Promise<Response> {
    // uncomment the following lines to enable bearer token authentication
    /*
    const bearerToken = (await storage.settings.get('bearer_token')).bearer_token as string;
    if (bearerToken && this.request.headers.get('Authorization') !== `Bearer ${bearerToken}`) {
      logger.warn('Invalid or missing bearer token', JSON.stringify(this.request));
      return new Response(401, 'Invalid or missing bearer token');
    }
    */

    /*
     * example: fetching configured username/password credentials
     *
    const auth = await storage.settings.get<AuthSection>('auth');
    */

    /*
     * example: fetching Google Oauth token from secret storage
     *
     const token = await storage.secrets.get<Token>('token');
     */

    if (this.request.path === '/discovery') {
      return new Response(200, discoveryPayload);
    } else if (this.request.path === '/tools/create-milestone-within-campaign') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.createMilestoneWithinCampaign(params, authData);

      return new Response(200, response);

    } else if (this.request.path === '/tools/update-milestone-within-campaign') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.updateMilestoneWithinCampaign(params, authData);

      return new Response(200, response);
    } else if (this.request.path === '/tools/get-child-campaigns') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.getChildCampaigns(params, authData);
      return new Response(200, response);

    } else if (this.request.path === '/tools/get-campaign-tasks') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.getCampaignTasks(params, authData);
      return new Response(200, response);
    } else if (this.request.path === '/tools/get-milestones-within-campaign') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.getMilestonesWithinCampaign(params, authData);
      return new Response(200, response);

    } else if (this.request.path === '/tools/generate-event-deck-from-excel') {
      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.generateEventDeckFromExcel(params, authData);
      return new Response(200, response);

    } else if (this.request.path === '/tools/excel-lookup-merge') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.excelLookupMerge(params, authData);
      return new Response(200, response);
    } else if (this.request.path === '/tools/csv-merge-lookup') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.csvMergeLookup(params, authData);

      return new Response(200, response);
    } else if (this.request.path === '/tools/excel-lookup-to-csv-file') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.excelLookupToCsvFile(params, authData);

      return new Response(200, response);
    } else if (this.request.path === '/tools/excel-sumif-to-csv-file') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.excelSumifToCsvFile(params, authData);

      return new Response(200, response);
    } else {
      return new Response(400, 'Invalid path');
    }
  }

  private async excelLookupMerge(parameters: any, authData: OptiAuthData) {
    const {
      excel_file1_id,
      excel_file2_id,
      file1_match_column,
      file2_match_column,
      append_columns
    } = parameters;

    if (!excel_file1_id) throw new Error('excel_file1_id is required');
    if (!excel_file2_id) throw new Error('excel_file2_id is required');

    const headers = {
      Authorization: `Bearer ${authData.credentials.access_token}`,
      'x-instance-id': authData.credentials.instance_id,
      'x-product-sku': authData.credentials.product_sku,
      'x-request-id': Date.now().toString()
    };

    try {

      logger.info('Downloading files from Opal backend');

      const file1Buffer = await this.downloadOpalFile(excel_file1_id, headers);
      const file2Buffer = await this.downloadOpalFile(excel_file2_id, headers);

      const resultBuffer = this.dynamicLookupExcel(
        file1Buffer,
        file2Buffer,
        file1_match_column,
        file2_match_column,
        append_columns
      );

      return {
        message: 'Lookup completed successfully',
        result_file_base64: resultBuffer.toString('base64')
      };

    } catch (error: any) {
      logger.error('Excel lookup failed', error.message);
      throw new Error('Excel lookup failed');
    }
  }

  private async csvMergeLookup(
    parameters: CsvMergeLookupParams,
    authData: OptiAuthData
  ) {

    const {
      excel_file1_id,
      excel_file2_id,
      file1_match_column,
      file2_match_column,
      append_columns
    } = parameters;

    try {

      if (!excel_file1_id) {
        throw new Error('excel_file1_id is required');
      }

      if (!excel_file2_id) {
        throw new Error('excel_file2_id is required');
      }

      logger.info('Fetching CSV files from Opal File Service');

      const file1Response = await axios.get<string>(
        `https://opal-backend.optimizely.com/v1/file/${excel_file1_id}`,
        {
          headers: {
            Authorization: `Bearer ${authData.credentials.access_token}`
          }
        }
      );

      const file2Response = await axios.get<string>(
        `https://opal-backend.optimizely.com/v1/file/${excel_file2_id}`,
        {
          headers: {
            Authorization: `Bearer ${authData.credentials.access_token}`
          }
        }
      );

      const csv1: string = file1Response.data;
      const csv2: string = file2Response.data;

      logger.info('Parsing CSV files');

      const workbook1 = xlsx.read(csv1, { type: 'string' });
      const workbook2 = xlsx.read(csv2, { type: 'string' });

      const sheet1 = xlsx.utils.sheet_to_json<Record<string, unknown>>(
        workbook1.Sheets[workbook1.SheetNames[0]]
      );

      const sheet2 = xlsx.utils.sheet_to_json<Record<string, unknown>>(
        workbook2.Sheets[workbook2.SheetNames[0]]
      );

      logger.info(`File1 rows: ${sheet1.length}`);
      logger.info(`File2 rows: ${sheet2.length}`);

      const lookupMap = new Map<string, Record<string, unknown>>();

      for (const row of sheet1) {

        const key = safeCellValue(row[file1_match_column]);

        if (key) {
          lookupMap.set(key, row);
        }
      }

      logger.info(`Lookup map built with ${lookupMap.size} entries`);

      const mergedRows: Array<Record<string, unknown>> = [];

      for (const row of sheet2) {

        const key = safeCellValue(row[file2_match_column]);
        const match = lookupMap.get(key);

        const mergedRow: Record<string, unknown> = { ...row };

        if (match) {

          for (const column of append_columns) {
            mergedRow[column] = match[column] ?? '';
          }

        } else {

          for (const column of append_columns) {
            mergedRow[column] = '';
          }

        }

        mergedRows.push(mergedRow);
      }

      logger.info('CSV merge complete');

      const resultSheet = xlsx.utils.json_to_sheet(mergedRows);
      const csvOutput = xlsx.utils.sheet_to_csv(resultSheet);

      return {
        message: 'Lookup completed successfully',
        csv_content: csvOutput
      };

    } catch (error: unknown) {

      if (error instanceof Error) {
        logger.error('CSV lookup merge failed:', error.message);
      } else {
        logger.error('CSV lookup merge failed with unknown error');
      }

      throw new Error('Failed to merge CSV files');
    }
  }

  private async excelLookupToCsvFile( // tool 1 fp&a main function
    parameters: ExcelLookupParams,
    authData: OptiAuthData
  ) {

    const {
      excel_file1_id,
      excel_file2_id,
      file1_match_column,
      file2_match_column,
      append_columns
    } = parameters;

    try {

      const file1Response = await axios.get<ArrayBuffer>(
        `https://opal-backend.optimizely.com/v1/file/${excel_file1_id}`,
        {
          responseType: 'arraybuffer',
          headers: {
            Authorization: `Bearer ${authData.credentials.access_token}`
          }
        }
      );

      const file2Response = await axios.get<ArrayBuffer>(
        `https://opal-backend.optimizely.com/v1/file/${excel_file2_id}`,
        {
          responseType: 'arraybuffer',
          headers: {
            Authorization: `Bearer ${authData.credentials.access_token}`
          }
        }
      );

      const workbook1 = xlsx.read(file1Response.data, { type: 'buffer' });
      const workbook2 = xlsx.read(file2Response.data, { type: 'buffer' });

      const sheet1 = xlsx.utils.sheet_to_json<Record<string, unknown>>(
        workbook1.Sheets[workbook1.SheetNames[0]]
      );

      const sheet2 = xlsx.utils.sheet_to_json<Record<string, unknown>>(
        workbook2.Sheets[workbook2.SheetNames[0]]
      );

      const lookupMap = new Map<string, Record<string, unknown>>();

      for (const row of sheet1) {

        const key = safeCellValue(row[file1_match_column]);

        if (key) {
          lookupMap.set(key, row);
        }
      }

      const mergedRows: Array<Record<string, unknown>> = [];

      for (const row of sheet2) {

        const key = safeCellValue(row[file2_match_column]);
        const match = lookupMap.get(key);

        const mergedRow = { ...row };

        if (match) {

          for (const column of append_columns) {
            mergedRow[column] = match[column] ?? '';
          }

        } else {

          for (const column of append_columns) {
            mergedRow[column] = '';
          }

        }

        mergedRows.push(mergedRow);
      }

      const resultSheet = xlsx.utils.json_to_sheet(mergedRows);
      const csvOutput = xlsx.utils.sheet_to_csv(resultSheet);

      return {
        filename: 'lookup_result.csv',
        content: csvOutput,
        content_type: 'text/csv'
      };

    } catch (error: unknown) {

      if (error instanceof Error) {
        logger.error('Excel lookup merge failed:', error.message);
      }

      throw new Error('Failed to process Excel lookup merge');
    }
  }

  private async excelSumifToCsvFile( // tool 2 fp&a main function
    parameters: {
      excel_file_id: string;
      group_column: string;
      sum_column: string;
      output_column_name: string;
    },
    authData: OptiAuthData
  ) {

    const {
      excel_file_id,
      group_column,
      sum_column,
      output_column_name
    } = parameters;

    try {

      // 🔹 STEP 1: Fetch file
      const fileResponse = await axios.get<ArrayBuffer>(
        `https://opal-backend.optimizely.com/v1/file/${excel_file_id}`,
        {
          responseType: 'arraybuffer',
          headers: {
            Authorization: `Bearer ${authData.credentials.access_token}`
          }
        }
      );

      // 🔹 STEP 2: Parse Excel
      const workbook = xlsx.read(fileResponse.data, { type: 'buffer' });

      const sheet = xlsx.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[workbook.SheetNames[0]]
      );

      // 🔹 STEP 3: Build grouped totals
      const groupedTotals = new Map<string, number>();

      for (const row of sheet) {

        const rawKey = row[group_column];
        const key = safeCellValue(rawKey);

        if (!key) continue;

        const value = Number(row[sum_column]) || 0;

        const currentTotal = groupedTotals.get(key) || 0;
        groupedTotals.set(key, currentTotal + value);
      }

      // 🔹 STEP 4: Append totals back to each row
      const updatedRows: Array<Record<string, unknown>> = [];

      for (const row of sheet) {

        const key = safeCellValue(row[group_column]);

        const total = key ? groupedTotals.get(key) || 0 : 0;

        const updatedRow = {
          ...row,
          [output_column_name]: total
        };

        updatedRows.push(updatedRow);
      }

      // 🔹 STEP 5: Convert to CSV
      const resultSheet = xlsx.utils.json_to_sheet(updatedRows);
      const csvOutput = xlsx.utils.sheet_to_csv(resultSheet);

      return {
        filename: 'sumif_result.csv',
        content: csvOutput,
        content_type: 'text/csv'
      };

    } catch (error: unknown) {

      if (error instanceof Error) {
        logger.error('Excel SUMIF failed:', error.message);
      }

      throw new Error('Failed to process Excel SUMIF');
    }
  }

  private async downloadOpalFile(fileId: string, headers: any): Promise<Buffer> {

    const url = `https://opal-backend.optimizely.com/v1/file/${fileId}`;

    const response = await axios.get(url, {
      headers,
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  }

  private dynamicLookupExcel(
    file1Buffer: Buffer,
    file2Buffer: Buffer,
    file1MatchCol: string,
    file2MatchCol: string,
    appendColumns: string[]
  ): Buffer {

    const wb1 = xlsx.read(file1Buffer, { type: 'buffer' });
    const wb2 = xlsx.read(file2Buffer, { type: 'buffer' });

    const sheet1 = wb1.SheetNames[0];
    const sheet2 = wb2.SheetNames[0];

    const file1 = xlsx.utils.sheet_to_json<any>(wb1.Sheets[sheet1]);
    const file2 = xlsx.utils.sheet_to_json<any>(wb2.Sheets[sheet2]);

    if (!file1.length || !file2.length) {
      throw new Error('One of the Excel files is empty');
    }

    const lookupMap = new Map();

    for (const row of file1) {
      const key = row[file1MatchCol];
      if (!lookupMap.has(key)) {
        lookupMap.set(key, row);
      }
    }

    const updated = file2.map((row) => {

      const key = row[file2MatchCol];
      const match = lookupMap.get(key);

      if (match) {
        appendColumns.forEach((col) => {
          row[col] = match[col];
        });
      }

      return row;
    });

    const newSheet = xlsx.utils.json_to_sheet(updated);
    const newWorkbook = xlsx.utils.book_new();

    xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'Result');

    return xlsx.write(newWorkbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });
  }

  private extractAuthData() {
    // Extract auth data from the request headers
    if (this.request.bodyJSON && this.request.bodyJSON.auth) {
      // Standard format: { "parameters": { ... } }
      logger.info('Extracted authData from \'auth\' key:', this.request.bodyJSON.auth);
      return this.request.bodyJSON.auth;
    } else {
      // Fallback for direct testing: { "name": "value" }
      logger.warn('\'auth\' key not found in request body. Using body directly.');
      return this.request.bodyJSON;
    }
  }

  private extractParameters() {
    // Extract parameters from the request body
    if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
      // Standard format: { "parameters": { ... } }
      logger.info('Extracted parameters from \'parameters\' key:', this.request.bodyJSON.parameters);
      return this.request.bodyJSON.parameters;
    } else {
      // Fallback for direct testing: { "name": "value" }
      logger.warn('\'parameters\' key not found in request body. Using body directly.');
      return this.request.bodyJSON;
    }
  }

  private async createMilestoneWithinCampaign(parameters: any, authData: OptiAuthData) {
    const { campaign_id, title, description, hex_color, tasks } = parameters;
    let { due_date } = parameters;

    try {
      if (!campaign_id) throw new Error('campaign_id is required');
      if (!title) throw new Error('title is required');
      if (!due_date) throw new Error('due_date is required');

      due_date = toIsoUtc(due_date);

      const milestonePayload = {
        title,
        description: description || null,
        due_date,
        hex_color: hex_color || '#4ECFD5',
        tasks: tasks || []
      };

      logger.info('Creating milestone with payload:', milestonePayload);

      const result = await createMilestoneWithinCampaign(
        campaign_id,
        milestonePayload,
        authData
      );

      return { milestone: result };

    } catch (error: any) {
      console.error('Error creating milestone:', error.message);
      throw new Error('Failed to create milestone in CMP');
    }
  }

  private async updateMilestoneWithinCampaign(parameters: any, authData: OptiAuthData) {
    const { id, title, description, campaign_id, hex_color, tasks } = parameters;
    let { due_date } = parameters;

    try {
      if (!id) throw new Error('Milestone "id" is required');
      if (!campaign_id) throw new Error('"campaign_id" is required');
      if (!tasks) throw new Error('"tasks" is required and must be an array');

      if (due_date) {
        due_date = toIsoUtc(due_date);
      }

      const payload = {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        campaign_id,
        ...(due_date && { due_date }),
        ...(hex_color && { hex_color }),
        tasks // required
      };

      logger.info('Updating milestone with payload:', payload);

      const result = await updateMilestoneWithinCampaign(
        id,
        payload,
        authData
      );

      return { milestone: result };

    } catch (error: any) {
      console.error('Error updating milestone:', error.message);
      throw new Error('Failed to update milestone in CMP');
    }
  }

  private async getChildCampaigns(parameters: any, authData: OptiAuthData) {
    const { campaign_id } = parameters;

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    try {
      const tree = await getCampaignTree(campaign_id, authData);
      return tree;
    } catch (error: any) {
      logger.error('Error fetching child campaigns:', error.message);
      throw new Error('Failed to fetch child campaigns from CMP');
    }
  }

  private async getCampaignTasks(parameters: any, authData: OptiAuthData) {
    const { campaign_id } = parameters;

    console.log('[Opal][getCampaignTasks] Params:', parameters);
    console.log('[Opal][getCampaignTasks] Auth org_sso_id:', authData.credentials.org_sso_id);


    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    try {
      const tasks = await getAllTasksForCampaign(campaign_id, authData);
      console.log('[Opal][getCampaignTasks] Returning tasks:', tasks.length);
      return { tasks };
    } catch (error: any) {
      logger.error('Error fetching campaign tasks:', error.message);
      throw new Error('Failed to fetch campaign tasks from CMP');
    }
  }

  private async getMilestonesWithinCampaign(
    parameters: any,
    authData: OptiAuthData
  ) {
    const { campaign_id } = parameters;

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    try {
      const milestones = await getMilestonesWithinCampaign(
        campaign_id,
        authData
      );

      return { milestones };
    } catch (error: any) {
      logger.error('Error fetching milestones:', error.message);
      throw new Error('Failed to fetch milestones from CMP');
    }
  }

  private async generateEventDeckFromExcel(
    parameters: { asset_id: string },
    authData: OptiAuthData
  ) {
    const { asset_id } = parameters;

    if (!asset_id) {
      throw new Error('asset_id is required');
    }

    const assetDetails = await getAssetFromCMP(asset_id, authData);
    const buffer = await this.downloadFileAsBuffer(assetDetails.url);
    const workbook = xlsx.read(buffer, { cellDates: true });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new Error('No worksheet found in Excel');
    }

    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, {
      range: 10,
      defval: ''
    });

    const MONTHS_IN_SCOPE = ['January', 'February', 'March'];
    const ALLOWED_LOBS = new Set([
      'Asset Management & Private Equity',
      'Products',
      'Government & Healthcare',
      'Financial Services',
      'Other'
    ]);

    const normalized: NormalizedEvent[] = rows.flatMap((row) => {
      if (!row['Event Begin Date'] || !row['LOB Description'] || !row['Title']) {
        return [];
      }

      const start = new Date(row['Event Begin Date']);
      if (isNaN(start.getTime())) {
        return [];
      }

      const month = start.toLocaleString('en-US', { month: 'long' });
      if (!MONTHS_IN_SCOPE.includes(month)) {
        return [];
      }

      const lobs = String(row['LOB Description'])
        .split(',')
        .map((l) => l.trim())
        .filter((l) => ALLOWED_LOBS.has(l));

      if (!lobs.length) {
        return [];
      }

      const isMultiLob = lobs.length > 1;

      return lobs.map((lob): NormalizedEvent => ({
        month,
        lob,
        category: this.getEventCategory(row['Event Type'] || ''),
        title: row['Title'],
        date: start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        stakeholder: this.extractFirst(row['Business Stakeholder']),
        city: this.extractFirst(row['Business Area']),
        isMultiLob
      }));
    });

    const grouped: GroupedEvents = {};

    for (const e of normalized) {
      grouped[e.month] ??= {};
      grouped[e.month][e.lob] ??= { 'in-person': [], online: [] };
      grouped[e.month][e.lob][e.category].push(e);
    }

    const slides = this.buildSlidesJson(grouped);

    return { slides };
  }


  private buildSlidesJson(grouped: GroupedEvents): Slide[] {
    const slides: Slide[] = [];

    for (const month of Object.keys(grouped)) {
      for (const lob of Object.keys(grouped[month])) {
        const inPerson = grouped[month][lob]['in-person'].map((e) => ({
          title: e.title,
          date: e.date,
          stakeholder: e.stakeholder,
          city: e.city,
          isMultiLob: e.isMultiLob
        }));

        const online = grouped[month][lob].online.map((e) => ({
          title: e.title,
          date: e.date,
          stakeholder: e.stakeholder,
          city: e.city,
          isMultiLob: e.isMultiLob
        }));

        slides.push({
          month,
          lob,
          legend: 'Italicized event – Event is aligned to more than one LOB',
          inPerson,
          online
        });
      }
    }

    return slides;
  }



  private extractFirst(value: string): string {
    return (
      String(value || '')
        .split(/[,;]/)
        .map((v) => v.trim())
        .filter(Boolean)[0] || '—'
    );
  }

  private getEventCategory(eventType = ''): 'in-person' | 'online' {
    const v = eventType.toLowerCase();
    if (v.includes('online') || v.includes('webcast') || v.includes('virtual')) {
      return 'online';
    }
    return 'in-person';
  }

  private async downloadFileAsBuffer(url: string): Promise<Buffer> {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
  }

}
