import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import PageContainer from "../../components/PageContainer";
import {
  Badge,
  Button,
  Dropdown,
  Form,
  FormInstance,
  Input,
  InputNumber,
  MenuProps,
  message,
  Modal,
  Progress,
  Select,
  Space,
  Switch,
  Tooltip,
} from "antd";
import {
  ClearOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  QuestionCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { selectAppStore, setAppStore } from "../../store";
import { useDispatch, useSelector } from "react-redux";
import useElectron from "../../hooks/electron";
import { useMemoizedFn, useRequest } from "ahooks";
import { AppLanguage, AppTheme } from "../../types";
import { useTranslation } from "react-i18next";
import { SessionStore, useSessionStore } from "@/store/session";
import { useShallow } from "zustand/react/shallow";

const version = import.meta.env.APP_VERSION;

interface GroupWrapperProps extends PropsWithChildren {
  title: string;
}

function GroupWrapper({ children, title }: GroupWrapperProps) {
  return (
    <div className="rounded-lg bg-white p-2 dark:bg-[#1F2024]">
      <div className="mb-5 flex flex-row items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-[#127AF3]" />
        {title}
      </div>
      {children}
    </div>
  );
}

const sessionSelector = (s: SessionStore) => ({
  updateAvailable: s.updateAvailable,
  updateChecking: s.updateChecking,
});

const SettingPage: React.FC = () => {
  const {
    onSelectDownloadDir,
    setAppStore: ipcSetAppStore,
    getEnvPath,
    openDir,
    clearWebviewCache,
    exportFavorites,
    importFavorites,
    checkUpdate,
    startUpdate,
    addIpcListener,
    removeIpcListener,
    installUpdate,
  } = useElectron();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const formRef = useRef<FormInstance<AppStore>>();
  const settings = useSelector(selectAppStore);
  const { data: envPath } = useRequest(getEnvPath);
  const [messageApi, contextHolder] = message.useMessage();
  const { updateAvailable, updateChecking } = useSessionStore(
    useShallow(sessionSelector),
  );
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  useEffect(() => {
    formRef.current?.setFieldsValue(settings);
  }, [settings]);

  const onSelectDir = async () => {
    const local = await onSelectDownloadDir();
    if (local) {
      dispatch(setAppStore({ local }));
      formRef.current?.setFieldValue("local", local);
    }
  };

  const renderButtonLabel = () => {
    return (
      <Button onClick={onSelectDir} icon={<FolderOpenOutlined />}>
        {t("selectFolder")}
      </Button>
    );
  };

  const renderTooltipLabel = (label: string, tooltip: string) => {
    return (
      <div className="flex flex-row items-center gap-1">
        <div className="item-label-text">{label}</div>
        <Tooltip title={tooltip} placement={"right"}>
          <QuestionCircleOutlined />
        </Tooltip>
      </div>
    );
  };

  const onFormValueChange = async (values: Partial<AppStore>) => {
    try {
      for (const key of Object.keys(values)) {
        if (values[key] != null) {
          await ipcSetAppStore(key, values[key]);
        }
      }
      dispatch(setAppStore(values));
    } catch (e: any) {
      messageApi.error(e.message);
    }
  };

  const items = [
    {
      key: "1",
      label: (
        <Space>
          <UploadOutlined />
          {t("importFavorite")}
        </Space>
      ),
    },
  ];

  const onMenuClick: MenuProps["onClick"] = async (e) => {
    const { key } = e;
    if (key === "1") {
      try {
        await importFavorites();
        messageApi.success(t("importFavoriteSuccess"));
      } catch (e: any) {
        messageApi.error(t("importFavoriteFailed"));
      }
    }
  };

  const handleExportFavorite = async () => {
    try {
      await exportFavorites();
      messageApi.success(t("exportFavoriteSuccess"));
    } catch (e: any) {
      messageApi.error(t("exportFavoriteFailed"));
    }
  };

  const handleCheckUpdate = useMemoizedFn(async () => {
    setOpenUpdateModal(true);
    await checkUpdate();
  });

  const handleHiddenUpdateModal = useMemoizedFn(() => {
    setOpenUpdateModal(false);
  });

  const handleUpdate = useMemoizedFn(() => {
    startUpdate();
  });

  const handleInstallUpdate = useMemoizedFn(() => {
    installUpdate();
  });

  useEffect(() => {
    const onDownloadProgress = (event: any, progress: any) => {
      setDownloadProgress(progress.percent);
    };
    const onDownloaded = () => {
      setUpdateDownloaded(true);
    };
    addIpcListener("updateDownloadProgress", onDownloadProgress);
    addIpcListener("updateDownloaded", onDownloaded);

    return () => {
      removeIpcListener("updateDownloadProgress", onDownloadProgress);
      removeIpcListener("updateDownloaded", onDownloaded);
    };
  }, []);

  return (
    <PageContainer title={t("setting")}>
      {contextHolder}
      <Form<AppStore>
        ref={formRef}
        layout="horizontal"
        // submitter={false}
        labelCol={{ style: { width: "140px" } }}
        labelAlign={"left"}
        colon={false}
        initialValues={settings}
        onValuesChange={onFormValueChange}
        className="flex flex-col gap-2"
      >
        <GroupWrapper title={t("basicSetting")}>
          <Form.Item name="local" label={renderButtonLabel()}>
            <Input
              width="xl"
              disabled
              placeholder={t("pleaseSelectDownloadDir")}
            />
          </Form.Item>
          <Form.Item name="theme" label={t("downloaderTheme")}>
            <Select
              options={[
                { label: t("followSystem"), value: AppTheme.System },
                { label: t("dark"), value: AppTheme.Dark },
                { label: t("light"), value: AppTheme.Light },
              ]}
              placeholder={t("pleaseSelectTheme")}
              allowClear={false}
            />
          </Form.Item>
          <Form.Item name="language" label={t("displayLanguage")}>
            <Select
              options={[
                { label: t("followSystem"), value: AppLanguage.System },
                { label: t("chinese"), value: AppLanguage.ZH },
                { label: t("english"), value: AppLanguage.EN },
              ]}
              placeholder={t("pleaseSelectLanguage")}
              allowClear={false}
            />
          </Form.Item>
          <Form.Item label={t("openInNewWindow")} name="openInNewWindow">
            <Switch />
          </Form.Item>
          <Form.Item label={t("downloadPrompt")} name="promptTone">
            <Switch />
          </Form.Item>
          <Form.Item label={t("showTerminal")} name="showTerminal">
            <Switch />
          </Form.Item>
          <Form.Item
            label={renderTooltipLabel(
              t("autoUpgrade"),
              t("autoUpgradeTooltip"),
            )}
            name="autoUpgrade"
          >
            <Switch />
          </Form.Item>
          <Form.Item label={t("allowBetaVersion")} name="allowBeta">
            <Switch />
          </Form.Item>
          <Form.Item
            label={renderTooltipLabel(t("privacy"), t("privacyTooltip"))}
            name="privacy"
          >
            <Switch />
          </Form.Item>
        </GroupWrapper>
        <GroupWrapper title={t("browserSetting")}>
          <Form.Item name="proxy" label={t("proxySetting")}>
            <Input width="xl" placeholder={t("pleaseEnterProxy")} />
          </Form.Item>
          <Form.Item
            name="useProxy"
            label={t("proxySwitch")}
            rules={[
              {
                validator(rules, value) {
                  if (value && formRef.current.getFieldValue("proxy") === "") {
                    return Promise.reject(t("pleaseEnterProxyFirst"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Switch />
          </Form.Item>
          <Form.Item label={t("blockAds")} name="blockAds">
            <Switch />
          </Form.Item>
          <Form.Item label={t("enterMobileMode")} name="isMobile">
            <Switch />
          </Form.Item>
          <Form.Item
            label={renderTooltipLabel(
              t("useImmersiveSniffing"),
              t("immersiveSniffingDescription"),
            )}
            name="useExtension"
          >
            <Switch />
          </Form.Item>
          <Form.Item label={t("moreAction")}>
            <Space>
              <Button
                onClick={async () => {
                  try {
                    await clearWebviewCache();
                    messageApi.success(t("clearCacheSuccess"));
                  } catch (err) {
                    messageApi.error(t("clearCacheFailed"));
                  }
                }}
                icon={<ClearOutlined />}
              >
                {t("clearCache")}
              </Button>
              <Dropdown.Button
                menu={{ items, onClick: onMenuClick }}
                onClick={handleExportFavorite}
              >
                <DownloadOutlined />
                {t("exportFavorite")}
              </Dropdown.Button>
            </Space>
          </Form.Item>
        </GroupWrapper>
        <GroupWrapper title={t("downloadSetting")}>
          <Form.Item
            name="downloadProxySwitch"
            label={t("downloadProxySwitch")}
            rules={[
              {
                validator(rules, value) {
                  if (value && formRef.current.getFieldValue("proxy") === "") {
                    return Promise.reject(t("pleaseEnterProxyFirst"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Switch />
          </Form.Item>
          <Form.Item label={t("deleteSegments")} name="deleteSegments">
            <Switch />
          </Form.Item>
          <Form.Item
            label={renderTooltipLabel(
              t("maxRunner"),
              t("maxRunnerDescription"),
            )}
            name="maxRunner"
          >
            <InputNumber min={1} max={50} precision={0} />
          </Form.Item>
          <Form.Item label={t("moreAction")}>
            <Space>
              <Button
                onClick={() => openDir(envPath.workspace)}
                icon={<FolderOpenOutlined />}
              >
                {t("configDir")}
              </Button>
              <Button
                onClick={() => openDir(envPath.binPath)}
                icon={<FolderOpenOutlined />}
              >
                {t("binPath")}
              </Button>
              <Button
                onClick={() => openDir(settings.local)}
                icon={<FolderOpenOutlined />}
              >
                {t("localDir")}
              </Button>
            </Space>
          </Form.Item>
          <Form.Item label={t("currentVersion")}>
            <Space>
              <div>{version}</div>
              <Badge dot={updateAvailable}>
                <Button type="text" onClick={handleCheckUpdate}>
                  {t("checkUpdate")}
                </Button>
              </Badge>
            </Space>
          </Form.Item>
        </GroupWrapper>
      </Form>

      <Modal
        title={t("updateModal")}
        open={openUpdateModal}
        onCancel={handleHiddenUpdateModal}
        footer={
          updateAvailable
            ? [
                <Button key="hidden" onClick={handleHiddenUpdateModal}>
                  {t("close")}
                </Button>,
                updateDownloaded ? (
                  <Button
                    key="install"
                    type="primary"
                    onClick={handleInstallUpdate}
                  >
                    {t("install")}
                  </Button>
                ) : (
                  <Button key="update" type="primary" onClick={handleUpdate}>
                    {t("update")}
                  </Button>
                ),
              ]
            : [
                <Button key="hidden" onClick={handleHiddenUpdateModal}>
                  {t("close")}
                </Button>,
              ]
        }
      >
        <div className="flex min-h-28 flex-col justify-center">
          {updateChecking
            ? "正在检查更新"
            : updateAvailable
              ? "有新版本"
              : "当前已是最新版本"}
          {!updateChecking && updateAvailable && (
            <Progress percent={updateDownloaded ? 100 : downloadProgress} />
          )}
        </div>
      </Modal>
    </PageContainer>
  );
};

export default SettingPage;
