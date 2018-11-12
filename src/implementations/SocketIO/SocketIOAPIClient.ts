import {
  autobind,
} from 'core-decorators';
import defer from 'defer-promise';
import uuidv4 from 'uuid/v4';
import {
  APIType,
  BaseRequestType,
  BaseResponseType,
} from '../../types';

import {
  APICall,
  BaseAPIClient,
} from '../../BaseAPIClient';
import {
  EventTypes,
  SocketIORequestType,
  SocketIOResponseType,
} from './common';

@autobind
export class SocketIOAPIClient<
  CustomBaseRequestType extends BaseRequestType = BaseRequestType
> extends BaseAPIClient<CustomBaseRequestType> {
  responseHandlers: {
    [requestID: string]: DeferPromise.Deferred<BaseResponseType>;
  } = {};
  // FIXME: add 'requests queue' with timeout
  //   (queue of to-send-when-socket-connects requests)
  socket?: SocketIOClient.Socket;
  init(
    socket: SocketIOClient.Socket,
  ) {
    this.socket = socket;
    socket.on(EventTypes.RESPONSE, (data: SocketIOResponseType) => {
      const requestHandler = this.responseHandlers[data.requestId];
      requestHandler && requestHandler.resolve(data.response);
    });
  }
  useAPI<
    RequestType extends CustomBaseRequestType,
    ResponseType extends BaseResponseType,
    name extends string,
  >(
    api: APIType<RequestType, ResponseType, name>,
  ): APICall<
    typeof api.__requestTypeHolder,
    typeof api.__responseTypeHolder,
    name
  > {
    return async (req) => {
      const requestId = uuidv4();
      const futureResponse = defer<ResponseType>();
      this.responseHandlers[requestId] = futureResponse;
      const reqToSend: SocketIORequestType = {
        apiName: api.name,
        request: req as any,
        requestId,
      };
      if (this.socket) {
        this.socket.emit(EventTypes.REQUEST, reqToSend);
      } else {
        throw new Error('Request Queue Not implemented yet');
      }

      return futureResponse.promise;
    };
  }
}