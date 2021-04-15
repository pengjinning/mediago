import React, { ReactNode } from "react";
import {
  Button,
  Collapse,
  Drawer,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import "./index.scss";
import tdApp from "renderer/common/scripts/td";
import * as Electron from "electron";
import variables from "renderer/common/scripts/variables";
import M3u8Form from "renderer/main-window/components/M3u8Form";
import { SourceItem } from "types/common";
import MediaGoForm from "renderer/main-window/components/MegiaGoForm";
import { SourceStatus } from "renderer/common/types";
import { ipcExec, ipcGetStore } from "renderer/main-window/utils";

const {
  remote,
  ipcRenderer,
}: {
  remote: Electron.Remote;
  ipcRenderer: Electron.IpcRenderer;
} = window.require("electron");

type ActionButton = {
  text: string;
  cb: () => void;
};

interface Props {
  tableData: SourceItem[];
  changeSourceStatus: (
    source: SourceItem,
    status: SourceStatus
  ) => Promise<void>;
  workspace: string;
}

interface State {
  isModalVisible: boolean;
  isDrawerVisible: boolean;
  page: number;
}

type StatusMap = { get<T extends SourceStatus>(status: T): string };

const statusMap = new Map([
  [SourceStatus.Ready, "#108ee9"],
  [SourceStatus.Failed, "#f50"],
  [SourceStatus.Success, "#87d068"],
  [SourceStatus.Downloading, "#2db7f5"],
]) as StatusMap;

// 下载列表
class DownloadList extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isModalVisible: false,
      isDrawerVisible: false,
      page: 1,
    };
  }

  async componentDidMount(): Promise<void> {}

  handleOk = (): void => {
    this.setState({
      isModalVisible: false,
    });
  };

  handleCancel = (): void => {
    this.setState({
      isModalVisible: false,
    });
  };

  // 抽屉关闭事件
  handleDrawerClose = (): void => {
    this.setState({
      isDrawerVisible: false,
    });
  };

  // 下载文件
  downloadFile = async (item: SourceItem): Promise<void> => {
    const { changeSourceStatus } = this.props;
    await changeSourceStatus(item, SourceStatus.Downloading);
    tdApp.onEvent("下载页面-开始下载");
    const exeFile = await ipcGetStore("exeFile");
    const workspace = await ipcGetStore("local");
    const { title, details } = item;
    const headers = Object.keys(details.requestHeaders)
      .reduce((prev: string[], cur) => {
        prev.push(`${cur}:${details.requestHeaders[cur]}`);
        return prev;
      }, [])
      .join("|");

    const { code, msg } = await ipcExec(
      exeFile,
      workspace,
      title,
      details.url,
      headers
    );
    if (code === 0) {
      await changeSourceStatus(item, SourceStatus.Success);
      tdApp.onEvent("下载页面-下载视频成功", {
        msg,
        url: details.url,
        exeFile,
      });
    } else {
      await changeSourceStatus(item, SourceStatus.Failed);
      tdApp.onEvent("下载页面-下载视频失败", {
        msg,
        url: details.url,
        exeFile,
      });
    }
  };

  // 展示资源详情
  showSourceDetail = (): void => {
    this.setState({
      isDrawerVisible: true,
    });
  };

  // 打开所在文件夹
  openDirectory = async (): Promise<void> => {
    const { workspace } = this.props;
    await remote.shell.openPath(workspace);
  };

  // 渲染操作按钮
  renderActionButtons = (value: string, row: SourceItem): ReactNode => {
    const buttons: ActionButton[] = [];
    switch (row.status) {
      case SourceStatus.Success:
        // 下载成功
        buttons.push({
          text: "打开目录",
          cb: this.openDirectory,
        });
        buttons.push({
          text: "详情",
          cb: this.showSourceDetail,
        });
        break;
      case SourceStatus.Failed:
        // 下载失败
        buttons.push({
          text: "重新下载",
          cb: () => this.downloadFile(row),
        });
        buttons.push({
          text: "详情",
          cb: this.showSourceDetail,
        });
        break;
      case SourceStatus.Downloading:
        // 正在下载
        // buttons.push();
        break;
      default:
        // 准备状态
        buttons.push({
          text: "下载",
          cb: () => this.downloadFile(row),
        });
        buttons.push({
          text: "详情",
          cb: this.showSourceDetail,
        });
        break;
    }
    return (
      <>
        {buttons.map((button) => (
          <Button type="link" onClick={button.cb}>
            {button.text}
          </Button>
        ))}
      </>
    );
  };

  render(): ReactNode {
    const { isModalVisible, isDrawerVisible } = this.state;
    const { tableData } = this.props;
    return (
      <div className="download-list">
        <Space>
          <Button
            onClick={() => {
              this.setState({ isModalVisible: true });
            }}
          >
            新建下载
          </Button>
          <Button
            onClick={() => {
              tdApp.onEvent("下载页面-打开浏览器页面");
              ipcRenderer.send("openBrowserWindow");
            }}
          >
            打开浏览器
          </Button>
          <Button
            onClick={async () => {
              await remote.shell.openExternal(variables.urls.help);
            }}
          >
            使用帮助
          </Button>
        </Space>
        <div className="download-list-table">
          <Table
            rowSelection={{}}
            rowKey="url"
            columns={[
              {
                title: "标题",
                dataIndex: "title",
                width: 250,
                className: "title",
                render: (text: string) => <span>{text}</span>,
              },
              {
                title: "详情",
                dataIndex: "url",
                width: 190,
                render: (value, row) => (
                  <div>
                    <div>分片数:{row.loading ? "正在加载" : row.title}</div>
                    <div>时长:{row.loading ? "正在加载" : row.title}</div>
                  </div>
                ),
              },
              {
                title: "状态",
                width: 90,
                render: (value, row) => (
                  <Space size="middle">
                    <Tag color={statusMap.get(row.status)}>{row.status}</Tag>
                  </Space>
                ),
              },
              {
                title: "操作",
                key: "action",
                render: this.renderActionButtons,
              },
            ]}
            dataSource={tableData}
            scroll={{ y: "calc(100vh - 310px)" }}
          />
        </div>
        <Modal
          title="新建下载"
          visible={isModalVisible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
        >
          <MediaGoForm />
        </Modal>
        <Drawer
          width={500}
          title="视频详情"
          placement="right"
          onClose={this.handleDrawerClose}
          visible={isDrawerVisible}
          className="download-drawer"
          footer={
            <div>
              <Space>
                <Button type="primary">保存</Button>
                <Button>取消</Button>
              </Space>
            </div>
          }
        >
          <div className="item">
            <div className="label">视频标题：</div>
            <div className="value">盗墓笔记</div>
          </div>
          <div className="item">
            <div className="label">m3u8地址：</div>
            <div className="value">http://baidu.com</div>
          </div>
          <div className="item">
            <div className="label">分片数：</div>
            <div className="value">123</div>
          </div>
          <div className="item">
            <div className="label">时长：</div>
            <div className="value">123123</div>
          </div>
          <div className="item">
            <div className="label">请求标头：</div>
            <div className="value">
              :authority: stats.g.doubleclick.net <br />
              :method: POST
              <br />
              :path: /j/collect?t=dc&aip=1&_r=3&v=1&
              <br />
              :scheme: https
              <br />
              accept: */*
              <br />
              accept-encoding: gzip, deflate, br
              <br />
              accept-language: zh-CN,zh;q=0.9,en;q=0.8
              <br />
              content-length: 0<br />
              content-type: text/plain
              <br />
            </div>
          </div>
          <div className="item">
            <div className="label">执行程序：</div>
            <div className="value">
              <Select defaultValue="lucy" style={{ width: 120 }}>
                <Select.Option value="jack">mediago</Select.Option>
                <Select.Option value="lucy">mediago</Select.Option>
              </Select>
            </div>
          </div>
          <Collapse defaultActiveKey={["1"]} ghost>
            <Collapse.Panel header="更多参数" key="1">
              <M3u8Form />
            </Collapse.Panel>
          </Collapse>
        </Drawer>
      </div>
    );
  }
}

export default DownloadList;