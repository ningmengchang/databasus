package restores_core

import (
	"time"

	"github.com/google/uuid"
)

type SavedRestoreTarget struct {
	ID             uuid.UUID `json:"id"             gorm:"column:id;type:uuid;primaryKey"`
	UserID         uuid.UUID `json:"userId"         gorm:"column:user_id;type:uuid;not null"`
	Name           string    `json:"name"           gorm:"column:name;type:text;not null"`
	DatabaseType   string    `json:"databaseType"   gorm:"column:database_type;type:text;not null"`
	ConnectionData string    `json:"-"              gorm:"column:connection_data;type:text;not null"`
	CreatedAt      time.Time `json:"createdAt"      gorm:"column:created_at;type:timestamptz;default:now()"`
	UpdatedAt      time.Time `json:"updatedAt"      gorm:"column:updated_at;type:timestamptz;default:now()"`
}

func (SavedRestoreTarget) TableName() string {
	return "saved_restore_targets"
}

type ConnectionFields struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Database string `json:"database,omitzero"`

	SslMode             string   `json:"sslMode,omitzero"`
	SslClientCert       string   `json:"sslClientCert,omitzero"`
	SslClientKey        string   `json:"sslClientKey,omitzero"`
	SslRootCert         string   `json:"sslRootCert,omitzero"`
	IsHttps             bool     `json:"isHttps,omitzero"`
	IsSrv               bool     `json:"isSrv,omitzero"`
	IsDirectConnection  bool     `json:"isDirectConnection,omitzero"`
	IsExcludeEvents     bool     `json:"isExcludeEvents,omitzero"`
	IsExcludeExtensions bool     `json:"isExcludeExtensions,omitzero"`
	IsRestoreOwnership  bool     `json:"isRestoreOwnership,omitzero"`
	IsRestorePrivileges bool     `json:"isRestorePrivileges,omitzero"`
	AuthDatabase        string   `json:"authDatabase,omitzero"`
	ExcludeTables       []string `json:"excludeTables,omitzero"`
	ExcludeCollections  []string `json:"excludeCollections,omitzero"`
}

type CreateSavedRestoreTargetRequest struct {
	Name         string           `json:"name"`
	DatabaseType string           `json:"databaseType"`
	Connection   ConnectionFields `json:"connection"`
}

type UpdateSavedRestoreTargetRequest struct {
	Name       string           `json:"name"`
	Connection ConnectionFields `json:"connection"`
}

type SavedRestoreTargetResponse struct {
	ID           uuid.UUID        `json:"id"`
	Name         string           `json:"name"`
	DatabaseType string           `json:"databaseType"`
	Connection   ConnectionFields `json:"connection"`
	CreatedAt    time.Time        `json:"createdAt"`
	UpdatedAt    time.Time        `json:"updatedAt"`
}
