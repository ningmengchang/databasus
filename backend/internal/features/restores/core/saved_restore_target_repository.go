package restores_core

import (
	"github.com/google/uuid"

	"databasus-backend/internal/storage"
)

type SavedRestoreTargetRepository struct{}

func (r *SavedRestoreTargetRepository) FindByUserID(userID uuid.UUID) ([]*SavedRestoreTarget, error) {
	var targets []*SavedRestoreTarget

	if err := storage.GetDb().
		Where("user_id = ?", userID).
		Order("name ASC").
		Find(&targets).Error; err != nil {
		return nil, err
	}

	return targets, nil
}

func (r *SavedRestoreTargetRepository) FindByID(id uuid.UUID) (*SavedRestoreTarget, error) {
	var target SavedRestoreTarget

	if err := storage.GetDb().
		Where("id = ?", id).
		First(&target).Error; err != nil {
		return nil, err
	}

	return &target, nil
}

func (r *SavedRestoreTargetRepository) Create(target *SavedRestoreTarget) error {
	target.ID = uuid.New()

	return storage.GetDb().Create(target).Error
}

func (r *SavedRestoreTargetRepository) Update(target *SavedRestoreTarget) error {
	return storage.GetDb().Save(target).Error
}

func (r *SavedRestoreTargetRepository) Delete(id, userID uuid.UUID) error {
	return storage.GetDb().
		Where("id = ? AND user_id = ?", id, userID).
		Delete(&SavedRestoreTarget{}).Error
}
