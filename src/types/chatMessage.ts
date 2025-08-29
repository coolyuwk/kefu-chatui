export interface QuestionItem {
  questionId: string;
  question: string;
}
export interface ImageItem {
  url: string;
}
export interface MsgModel {
  questionList: QuestionItem[];
  imageModels: ImageItem[];
}

export interface ChatMessage {
  groupId: string;
  msg?: string;
  showMsg?: string;
  userId: string;
  userName: string;
  isRead: boolean;
  isKefu: boolean;
  msgModel?: MsgModel;
  msgType?: string;
  time: string;
  creationTime: string;
  creatorId?: string;
  lastModificationTime?: string | null;
  lastModifierId?: string | null;
  id: string;
}

export interface GroupUser {
  groupId: string;
  userId: string;
  userName: string;
  isRobot: boolean;
  isLeave: boolean;
  shortName: string;
}

export interface Group {
  groupId: string;
  title: string;
  lastMsg: string;
  close: boolean;
  newGroup: boolean;
  closeStr: string;
  userName: string;
  userId: string;
  language: string;
  unReadCount: number;
  showTime: string;
  groupUsers: GroupUser[];
  creationTime: string;
  id: string;
}

export interface ChatHistoryResponse {
  groups: Group;
  list: ChatMessage[];
}