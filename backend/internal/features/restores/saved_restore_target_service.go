package restores

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	restores_core "databasus-backend/internal/features/restores/core"
	users_models "databasus-backend/internal/features/users/models"
	"databasus-backend/internal/util/encryption"
)

type SavedRestoreTargetService struct {
	repository     *restores_core.SavedRestoreTargetRepository
	fieldEncryptor encryption.FieldEncryptor
}

func (s *SavedRestoreTargetService) GetSavedTargets(
	user *users_models.User,
) ([]*restores_core.SavedRestoreTargetResponse, error) {
	targets, err := s.repository.FindByUserID(user.ID)
	if err != nil {
		return nil, err
	}

	result := make([]*restores_core.SavedRestoreTargetResponse, 0, len(targets))
	for _, t := range targets {
		resp, err := s.toResponse(t)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt target %s: %w", t.ID, err)
		}
		result = append(result, resp)
	}

	return result, nil
}

func (s *SavedRestoreTargetService) CreateSavedTarget(
	user *users_models.User,
	req *restores_core.CreateSavedRestoreTargetRequest,
) (*restores_core.SavedRestoreTargetResponse, error) {
	if req.Name == "" {
		return nil, errors.New("name is required")
	}
	if req.DatabaseType == "" {
		return nil, errors.New("database type is required")
	}

	plaintextJSON, err := json.Marshal(req.Connection)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal connection data: %w", err)
	}

	encrypted, err := s.fieldEncryptor.Encrypt(string(plaintextJSON))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt connection data: %w", err)
	}

	now := time.Now().UTC()
	target := &restores_core.SavedRestoreTarget{
		UserID:         user.ID,
		Name:           req.Name,
		DatabaseType:   req.DatabaseType,
		ConnectionData: encrypted,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repository.Create(target); err != nil {
		return nil, err
	}

	return s.toResponse(target)
}

func (s *SavedRestoreTargetService) UpdateSavedTarget(
	user *users_models.User,
	targetID uuid.UUID,
	req *restores_core.UpdateSavedRestoreTargetRequest,
) (*restores_core.SavedRestoreTargetResponse, error) {
	target, err := s.repository.FindByID(targetID)
	if err != nil {
		return nil, err
	}

	if target.UserID != user.ID {
		return nil, errors.New("saved restore target not found")
	}

	if req.Name != "" {
		target.Name = req.Name
	}

	plaintextJSON, err := json.Marshal(req.Connection)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal connection data: %w", err)
	}

	encrypted, err := s.fieldEncryptor.Encrypt(string(plaintextJSON))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt connection data: %w", err)
	}

	target.ConnectionData = encrypted
	target.UpdatedAt = time.Now().UTC()

	if err := s.repository.Update(target); err != nil {
		return nil, err
	}

	return s.toResponse(target)
}

func (s *SavedRestoreTargetService) DeleteSavedTarget(
	user *users_models.User,
	targetID uuid.UUID,
) error {
	target, err := s.repository.FindByID(targetID)
	if err != nil {
		return err
	}

	if target.UserID != user.ID {
		return errors.New("saved restore target not found")
	}

	return s.repository.Delete(targetID, user.ID)
}

func (s *SavedRestoreTargetService) toResponse(
	target *restores_core.SavedRestoreTarget,
) (*restores_core.SavedRestoreTargetResponse, error) {
	decrypted, err := s.fieldEncryptor.Decrypt(target.ConnectionData)
	if err != nil {
		return nil, err
	}

	var conn restores_core.ConnectionFields
	if err := json.Unmarshal([]byte(decrypted), &conn); err != nil {
		return nil, fmt.Errorf("failed to unmarshal connection data: %w", err)
	}

	return &restores_core.SavedRestoreTargetResponse{
		ID:           target.ID,
		Name:         target.Name,
		DatabaseType: target.DatabaseType,
		Connection:   conn,
		CreatedAt:    target.CreatedAt,
		UpdatedAt:    target.UpdatedAt,
	}, nil
}
