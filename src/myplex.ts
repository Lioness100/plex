import got from 'got';
import { URL } from 'url';
import debug from 'debug';
import { CookieJar } from 'tough-cookie';
import pAny from 'p-any';

import { TIMEOUT, BASE_HEADERS } from './config';
import { UserResponse, ResourcesResponse, Connection } from './myplexInterfaces';
import { PlexServer } from './server';

const log = debug('plex');

/**
 * MyPlex account and profile information. This object represents the data found Account on
 * the myplex.tv servers at the url https://plex.tv/users/account. You may create this object
 * directly by passing in your username & password (or token). There is also a convenience
 * method provided at :class:`~plexapi.server.PlexServer.myPlexAccount()` which will create
 * and return this object.
 */
export class MyPlexAccount {
  static key = 'https://plex.tv/api/v2/user';

  FRIENDINVITE = 'https://plex.tv/api/servers/{machineId}/shared_servers'; // post with data
  HOMEUSERCREATE = 'https://plex.tv/api/home/users?title={title}'; // post with data
  EXISTINGUSER = 'https://plex.tv/api/home/users?invitedEmail={username}'; // post with data
  FRIENDSERVERS = 'https://plex.tv/api/servers/{machineId}/shared_servers/{serverId}'; // put with data
  PLEXSERVERS = 'https://plex.tv/api/servers/{machineId}'; // get
  FRIENDUPDATE = 'https://plex.tv/api/friends/{userId}'; // put with args, delete
  REMOVEHOMEUSER = 'https://plex.tv/api/home/users/{userId}'; // delete
  REMOVEINVITE = 'https://plex.tv/api/invites/requested/{userId}?friend=0&server=1&home=0'; // delete
  REQUESTED = 'https://plex.tv/api/invites/requested'; // get
  REQUESTS = 'https://plex.tv/api/invites/requests'; // get
  SIGNIN = 'https://plex.tv/users/sign_in.json'; // get with auth
  WEBHOOKS = 'https://plex.tv/api/v2/user/webhooks'; // get, post with data

  /** Your Plex account ID */
  id?: number;
  /** Unknown */
  uuid?: string;
  /**
   * auth token for user by plex
   */
  authenticationToken?: string;
  /** Unknown */
  certificateVersion?: number;
  /** Unknown. - Looks like an alias for `username` */
  title?: string;
  /** Your current Plex email address */
  email?: string;
  /** URL of your account thumbnail */
  thumb?: string;
  /** Unknown */
  guest?: boolean;
  /** Unknown */
  home?: boolean;
  /** Unknown */
  homeSize?: number;
  /** Unknown */
  maxHomeSize?: number;
  /** Your Plex locale */
  locale?: string | null;
  /** Your current mailing list status. */
  mailingListStatus?: 'active' | 'inactive';
  mailingListActive?: boolean;
  /** Email address to add items to your `Watch Later` queue. */
  queueEmail?: string;
  /** Unknown */
  restricted?: boolean;
  /** Description */
  scrobbleTypes?: string;
  /** Name of subscription plan */
  subscriptionPlan?: string | null;
  /** String representation of `subscriptionActive` */
  subscriptionStatus?: 'active' | 'inactive';
  /** True if your subsctiption is active */
  subscriptionActive?: boolean | null;
  /** List of features allowed on your subscription */
  subscriptionFeatures?: string[];
  /** List of devices your allowed to use with this account */
  entitlements?: string[];

  /**
   *
   * @param username Your MyPlex username
   * @param password Your MyPlex password
   * @param token Token used to access this client.
   * @param session Use your own session object if you want to cache the http responses from PMS
   * @param timeout timeout in seconds on initial connect to myplex
   */
  constructor(
    public username?: string,
    private readonly password?: string,
    public token?: string,
    readonly session = new CookieJar(),
    private readonly timeout = TIMEOUT,
  ) {}

  /**
   * Returns a new :class:`~server.PlexServer` or :class:`~client.PlexClient` object.
   * Often times there is more than one address specified for a server or client.
   * This function will prioritize local connections before remote and HTTPS before HTTP.
   * After trying to connect to all available addresses for this resource and
   * assuming at least one connection was successful, the PlexServer object is built and returned.
   */
  async connect(): Promise<MyPlexAccount> {
    if (!this.token) {
      log('Logging in with username', { username: this.username });
      const data = await this._signin(this.username, this.password, this.timeout);
      this._loadData(data);
      return this;
    }

    log('Logging in with token');
    const data = await this.query<UserResponse>(MyPlexAccount.key);
    this._loadData(data);
    return this;
  }

  /**
   * Returns the :class:`~plexapi.myplex.MyPlexResource` that matches the name specified.
   */
  async resource(name: string): Promise<MyPlexResource> {
    const resources = await this.resources();
    const matchingResource = resources.find(resource => resource.name === name);
    if (matchingResource) {
      return matchingResource;
    }

    throw new Error(`Unable to find resource ${name}`);
  }

  async resources(): Promise<MyPlexResource[]> {
    const data = await this.query<ResourcesResponse[]>(MyPlexResource.key);
    return data.map(device => new MyPlexResource(device));
  }

  /**
   * Main method used to handle HTTPS requests to the Plex client. This method helps
   * by encoding the response to utf-8 and parsing the returned XML into and
   * ElementTree object. Returns None if no data exists in the response.
   * TODO: use headers
   * @param path
   * @param method
   * @param headers
   * @param timeout
   */
  async query<T = any>(
    url: string,
    method: 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' = 'get',
    headers?: any,
    timeout?: number,
    username?: string,
    password?: string,
  ): Promise<T> {
    const requestHeaders = this._headers();
    if (username && password) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      requestHeaders.Authorization = `Basic ${credentials}`;
    }

    const response = await got({
      method,
      url: new URL(url),
      headers: requestHeaders,
      timeout: timeout ?? TIMEOUT,
      cookieJar: this.session,
      username,
      password,
      retry: 0,
    }).json<T>();

    return response;
  }

  /**
   * Returns a str, a new "claim-token", which you can use to register your new Plex Server instance to your account.
   * @link https://hub.docker.com/r/plexinc/pms-docker/
   * @link https://www.plex.tv/claim/
   */
  async claimToken(): Promise<string> {
    const url = 'https://plex.tv/api/claim/token.json';
    const response = await this.query<{ token: string }>(url, 'get', undefined, TIMEOUT);
    return response.token;
  }

  private _headers(): Record<string, string> {
    const headers = {
      ...BASE_HEADERS,
      'Content-type': 'application/json',
    };
    if (this.token) {
      headers['X-Plex-Token'] = this.token;
    }

    return headers;
  }

  private async _signin(
    username?: string,
    password?: string,
    timeout?: number,
  ): Promise<UserResponse> {
    const data = await this.query<{ user: UserResponse }>(
      this.SIGNIN,
      'post',
      undefined,
      timeout,
      username,
      password,
    );
    return data.user;
  }

  private _loadData(user: UserResponse): void {
    this.token = user.authToken;
    this.authenticationToken = this.token;
    this.certificateVersion = Number(user.certificateVersion);
    this.email = user.email;
    this.guest = user.guest;
    this.home = user.home;
    this.homeSize = Number(user.homeSize);
    this.maxHomeSize = Number(user.maxHomeSize);
    this.id = user.id;
    this.uuid = user.uuid;
    this.username = user.username;
    this.title = user.title;
    this.locale = user.locale;
    this.mailingListStatus = user.mailingListStatus ?? 'inactive';
    this.mailingListActive = user.mailingListActive;
    this.queueEmail = user.queueEmail;
    this.thumb = user.thumb;
    this.scrobbleTypes = user.scrobbleTypes;
    this.restricted = user.restricted;
    this.subscriptionActive = user.subscription?.active ?? null;
    this.subscriptionStatus = (user.subscription?.status?.toLowerCase() as 'active') ?? 'inactive';
    this.subscriptionPlan = user.subscription?.plan ?? null;
    this.subscriptionFeatures = user.subscription?.features ?? [];
    this.entitlements = user.entitlements;
  }
}

/**
 * Connects to the specified cls with url and token
 */
export async function connect(
  cls: (...args: ConstructorParameters<typeof PlexServer>) => PlexServer,
  url: string,
  token: string,
  timeout: number,
): Promise<PlexServer> {
  const device = cls(url, token, undefined, timeout);
  await device.connect();
  return device;
}

/**
 * This object represents resources connected to your Plex server that can provide
 * content such as Plex Media Servers, iPhone or Android clients, etc.
 */
export class MyPlexResource {
  static key = 'https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1';
  TAG = 'Device';
  /** Descriptive name of this resource */
  name!: string;
  /** True if this resource is one of your own (you logged into it) */
  owned!: boolean;
  /** This resources accesstoken */
  accessToken!: string;
  /** Unique ID for this resource */
  clientIdentifier!: string;
  /** List of !:class!:`~myplex.ResourceConnection` objects for this resource */
  connections!: ResourceConnection[];
  /** Timestamp this resource first connected to your server */
  createdAt!: Date;
  /** Timestamp this resource last connected */
  lastSeenAt!: Date;
  /** Best guess on the type of device this is (PS, iPhone, Linux, etc) */
  device!: string | null;
  /** Unknown */
  home!: boolean;
  /** OS the resource is running (Linux, Windows, Chrome, etc.) */
  platform!: string;
  /** Version of the platform */
  platformVersion!: string;
  /** True if the resource is online */
  presence!: boolean;
  /** Plex product (Plex Media Server, Plex for iOS, Plex Web, etc.) */
  product!: string;
  /** Version of the product. */
  productVersion!: string;
  /** List of services this resource provides (client, server, player, pubsub-player, etc.) */
  provides!: string;
  /** Unknown (possibly True if the resource has synced content?) */
  synced!: boolean;

  constructor(data: ResourcesResponse) {
    this._loadData(data);
  }

  async connect(ssl: boolean | null = null, timeout?): Promise<PlexServer> {
    const connections = [...this.connections].sort((a, b) => {
      return Number(b.local) - Number(a.local);
    });
    const ownedOrUnownedNonLocal = (connection: ResourceConnection): boolean => {
      if (this.owned || (!this.owned && !connection.local)) {
        return true;
      }

      return false;
    };

    // Sort connections from (https, local) to (http, remote)
    // Only check non-local connections unless we own the resource
    const https = connections.filter(x => ownedOrUnownedNonLocal(x)).map(x => x.uri);
    const http = connections.filter(x => ownedOrUnownedNonLocal(x)).map(x => x.httpuri);

    let attemptUrls: string[];
    if (ssl === null) {
      attemptUrls = [...https, ...http];
    } else {
      attemptUrls = ssl ? https : http;
    }

    // TODO: switch between PlexServer and PlexClient

    // Try connecting to all known resource connections in parellel, but
    // only return the first server (in order) that provides a response.
    const promises = attemptUrls.map(async url =>
      connect((...args) => new PlexServer(...args), url, this.accessToken, timeout),
    );
    const result = await pAny(promises);
    return result;
  }

  private _loadData(data: ResourcesResponse): void {
    this.name = data.name;
    this.accessToken = data.accessToken ?? '';
    this.owned = data.owned;
    this.clientIdentifier = data.clientIdentifier;
    this.createdAt = new Date(data.createdAt);
    this.lastSeenAt = new Date(data.lastSeenAt);
    this.device = data.device;
    this.home = data.home;
    this.platform = data.platform;
    this.platformVersion = data.platformVersion;
    this.provides = data.provides;
    this.synced = data.synced;
    this.presence = data.presence;
    this.product = data.product;
    this.productVersion = data.productVersion;
    this.connections = data.connections.map(connection => new ResourceConnection(connection));
  }
}

export class ResourceConnection {
  TAG = 'Connection';
  /** Local IP address */
  address!: string;
  /** Full local address */
  httpuri!: string;
  /** True if local */
  local!: boolean;
  /** 32400 */
  port!: number;
  /** HTTP or HTTPS */
  protocol!: string;
  /** External address */
  uri!: string;

  constructor(data: Connection) {
    this._loadData(data);
  }

  private _loadData(data: Connection): void {
    this.address = data.address;
    this.protocol = data.protocol;
    this.port = Number(data.port);
    this.uri = data.uri;
    this.local = data.local;
    this.httpuri = `http://${data.address}:${data.port}`;
  }
}
